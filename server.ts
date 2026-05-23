import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Enable large photo payloads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Healthy check route
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Photo & Vibe analysis API endpoint using a 3-agent pipeline
app.post("/api/analyze-photos", async (req, res) => {
  const { images, location } = req.body;

  if (!images || !Array.isArray(images) || images.length === 0) {
    return res.status(400).json({ error: "At least one selfie is required for analysis." });
  }

  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey || geminiApiKey === "MY_GEMINI_API_KEY") {
    return res.status(500).json({
      error: "Gemini API key is not configured. Please add GEMINI_API_KEY to the Secrets panel in AI Studio settings."
    });
  }

  try {
    // Configure response as a chunked live stream
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Transfer-Encoding", "chunked");
    res.flushHeaders?.();

    const sendStep = (stepName: string, status: string, data: any) => {
      res.write(JSON.stringify({ step: stepName, status, data }) + "\n");
      if (typeof (res as any).flush === "function") {
        (res as any).flush();
      }
    };

    // Lazy initialize standard AI client with telemetry user-agent
    const ai = new GoogleGenAI({
      apiKey: geminiApiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    console.log("[Multi-Agent] Starting Multi-Photo Analysis Pipeline");

    // Prepare image payload parts for the Extraction Agent
    const imageParts: any[] = [];
    images.forEach((imgBase64Str: string) => {
      const base64Data = imgBase64Str.includes(",")
        ? imgBase64Str.split(",")[1]
        : imgBase64Str;
      
      const mimeType = imgBase64Str.includes("data:")
        ? imgBase64Str.split(";")[0].split(":")[1]
        : "image/jpeg";

      imageParts.push({
        inlineData: {
          mimeType,
          data: base64Data,
        },
      });
    });

    // ==========================================
    // AGENT 1: EXTRACTION AGENT (Multimodal Fact Miner)
    // ==========================================
    console.log("[Agent 1] Initializing Extraction Agent...");
    
    const extractionSchema = {
      type: Type.OBJECT,
      properties: {
        detectedObjects: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "List of real tangible objects, props, clothes patterns, drinks, tech gear or details observed in the selfies."
        },
        detectedBackground: {
          type: Type.STRING,
          description: "Summary describing the layout or setting of the selfies (e.g. clean office, sunny coffee shop patio, retro gaming bedroom)."
        },
        dominantColors: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "List of 3 contrasting vibrant hex color strings matching the crew's fashion or context."
        },
        participantsRaw: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.INTEGER },
              detectedName: { type: Type.STRING, description: "Witty custom name based on visual vibes." },
              avatarEmoji: { type: Type.STRING, description: "An emoji matching their hair, glasses, or expression." },
              emotion: { type: Type.STRING, description: "Facial expressions (e.g., serious hacker stare, broad grin, competitive pointing)." },
              apparelDescription: { type: Type.STRING, description: "Description of what they are wearing." },
              clothingColor: { type: Type.STRING, description: "Vibrant hex color matching their clothes." },
              hasGlasses: { type: Type.BOOLEAN, description: "True if they are wearing obvious glasses/sunglasses." },
              photoIndex: { type: Type.INTEGER, description: "The 0-based index of the photo showing this person." },
              faceBox: {
                type: Type.ARRAY,
                items: { type: Type.INTEGER },
                description: "Exactly 4 integers [ymin, xmin, ymax, xmax] scaled 0 to 1000 representing normalized box."
              }
            },
            required: ["id", "detectedName", "avatarEmoji", "emotion", "apparelDescription", "clothingColor", "hasGlasses", "photoIndex", "faceBox"]
          }
        }
      },
      required: ["detectedObjects", "detectedBackground", "dominantColors", "participantsRaw"]
    };

    const extractionInstruction = `You are Agent 1 (Extraction Agent), an expert pattern recognition specialist and digital visual anthropologist.
Your single mandate is to study the attached photos and inventory all physical props, fashion colors, background structures, and people attributes.
Extract the bounding boxes of all faces [ymin, xmin, ymax, xmax] (range 0 to 1000). Highlight any specific props they are holding or that are near them.`;

    const responseAgent1 = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        ...imageParts,
        { text: extractionInstruction }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: extractionSchema,
        temperature: 0.1, // precision focus
      }
    });

    const extractionResult = JSON.parse(responseAgent1.text?.trim() || "{}");
    console.log("[Agent 1] Fact extraction completed:", JSON.stringify(extractionResult, null, 2));
    sendStep("agent1", "completed", extractionResult);


    // ==========================================
    // AGENT 2: ASSET DESIGN AGENT (Graphic Artist & SVG Illustrator)
    // ==========================================
    console.log("[Agent 2] Initializing Asset Generation Agent...");

    const assetSchema = {
      type: Type.OBJECT,
      properties: {
        participantsWithAssets: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.INTEGER },
              detectedName: { type: Type.STRING },
              avatarEmoji: { type: Type.STRING },
              emotion: { type: Type.STRING },
              apparelDescription: { type: Type.STRING },
              clothingColor: { type: Type.STRING },
              hasGlasses: { type: Type.BOOLEAN },
              photoIndex: { type: Type.INTEGER },
              faceBox: {
                type: Type.ARRAY,
                items: { type: Type.INTEGER }
              },
              cartoonSvg: {
                type: Type.STRING,
                description: "An elegant, highly detailed, fully styled vector illustration of the human participant as an adorable, funny oversized 'bobblehead' doll SVG character sprite. The head must be massive (occupying ~60% of the character height) while the body and legs are tiny/miniature, reminiscent of authentic collectible bobblehead figurines. MUST start with '<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 130\" width=\"100%\" height=\"100%\">' and end with '</svg>'. The SVG MUST be TRANSPARENT (no solid or circular background wrapper). Layout: (1) MASSIVE GIANT HEAD (y Range: 5-75, centered at x=50, width ~65-70) with a beautiful caricature face, expressive cartoon eyes, mouth, nose, styled full hair/cap matching avatarEmoji, and thick cool spectacles frames if hasGlasses is true, (2) MINIATURE TORSO & ARMS (y Range: 75-105) matching apparelDescription and rendered in clothingColor, and (3) TINY RUNNING LEGS & SHOES (y Range: 105-125) representing a funny active athletic runner. DO NOT include raw code blocks, markdown tags, backticks, or any non-SVG text!"
              }
            },
            required: ["id", "detectedName", "avatarEmoji", "emotion", "apparelDescription", "clothingColor", "hasGlasses", "photoIndex", "faceBox", "cartoonSvg"]
          }
        },
        backdropSvg: {
          type: Type.STRING,
          description: "A gorgeous, high-fidelity, extremely detailed widescreen vector illustration landscape SVG representing the detected background context (e.g., if Golden Gate Bridge is detected, draw a beautiful layered orange suspension bridge over San Francisco bay with sky gradients, clouds, water reflections, sun rays, and surrounding hills. If office workspace is detected, draw cool retro computers, glowing screen light, bookshelves, plants, etc). MUST start with '<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1000 600\" width=\"100%\" height=\"100%\" preserveAspectRatio=\"xMidYMid slice\">' and end with '</svg>'. Use <linearGradient> for gorgeous sunset skies or ambient room highlights, and detailed shapes like <rect>, <circle>, <path> to create deep parallax/perspective depth. DO NOT include markdown text blocks, comment wrappers, or backticks!"
        }
      },
      required: ["participantsWithAssets", "backdropSvg"]
    };

    const assetInstruction = `You are Agent 2 (Asset Agent). Your primary role is to sketch custom, highly detailed, full-body vector action cartoon characters for all verified human participants, and to generate a gorgeous, cinematic custom landscape background vector SVG representing 'detectedBackground'.
    Analyze each participant's: (1) apparelDescription, (2) clothingColor, (3) emotion, (4) hasGlasses state (MUST draw cool prominent glasses/sunglasses if true), and (5) avatarEmoji. Then, generate beautiful transparent inline SVG code representing them.
    Also analyze 'detectedBackground' and design an incredible widescreen vector background landscape of that scene using rich gradients, silhouettes, sun/light rays, layers and custom features (e.g. if Golden Gate Bridge is in the context, draw the iconic suspension bridge crossing the bay with layered hills, clouds, and beautiful waves!).
    
    VECTOR GRAPHICS REQUIREMENT HIGHLIGHTS:
    - Use cross-browser SVG elements: <rect>, <circle>, <ellipse>, <path>, <polygon>, <linearGradient>, <g>.
    - Character SVGs Root canvas must be: viewBox="0 0 100 130" with xmlns defined and be completely transparent (no background circle or solid shapes).
    - Bobblehead Styling: Define a MASSIVE, OVERSIZED, EXHAUSTIVELY DETAILED HEAD (spanning y range 5 to 75, x-center: 50, with skin tone, styled hair/eyes, cool glasses frames if they wear glasses) with a tiny, cute, miniature body torso (y: 75 to 105) and funny little stubby running legs & shoes (y: 105 to 125) below.
    - Backdrop SVG canvas should be: viewBox="0 0 1000 600" with width="100%" height="100%" preserveAspectRatio="xMidYMid slice" and stunning, bright color grading.
    - Return clean, pure, well-formed SVG strings directly. Do NOT insert markdown wrappers, code blocks or comments.`;

    const responseAgent2 = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        { text: assetInstruction + "\nDetected Context:\nBackground: " + extractionResult.detectedBackground + "\nObjects: " + JSON.stringify(extractionResult.detectedObjects || []) + "\nParticipants: " + JSON.stringify(extractionResult.participantsRaw || [], null, 2) }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: assetSchema,
        temperature: 0.9,
      }
    });

    const assetResult = JSON.parse(responseAgent2.text?.trim() || "{}");
    console.log("[Agent 2] Cartoon SVG assets generated for participants:", (assetResult.participantsWithAssets || []).length);
    sendStep("agent2", "completed", assetResult);


    // ==========================================
    // AGENT 3: CONSTRUCTOR AGENT (Game Mechanic & Style Director)
    // ==========================================
    console.log("[Agent 3] Initializing Constructor Agent...");

    const constructorSchema = {
      type: Type.OBJECT,
      properties: {
        gameTemplate: {
          type: Type.STRING,
          description: "Must be exactly one of: 'GatheringCollectAdventure', 'MemoryLaneTreasureHunt', 'VibeMazeQuest', or 'LaserVibeProtector'."
        },
        rationale: {
          type: Type.STRING,
          description: "Explain in 1-2 witty sentences why this gameplay type fits the group's visual vibe or objects."
        },
        backgroundTheme: {
          type: Type.STRING,
          description: "Must be exactly one of: 'nature', 'cyberpunk', 'neon', 'cozy', 'retro', or 'sunset'."
        },
        primaryGameColor: { type: Type.STRING, description: "Dominant dark base Hex color for the game frame." },
        secondaryGameColor: { type: Type.STRING, description: "Vibrant contrasting accent Hex color." },
        mappedCollectibles: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "E.g. Coffee mug, Laptop, Puffer Jacket" },
              emoji: { type: Type.STRING },
              points: { type: Type.INTEGER, description: "Points earned, usually 10 to 30." },
              description: { type: Type.STRING, description: "Short description of item significance." }
            },
            required: ["name", "emoji", "points", "description"]
          }
        },
        mappedHazards: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "E.g. Broken screen, Slack alert, Fog" },
              emoji: { type: Type.STRING },
              points: { type: Type.INTEGER, description: "Penalty points, e.g. -10 to -25." },
              description: { type: Type.STRING }
            },
            required: ["name", "emoji", "points", "description"]
          }
        },
        mappedPowerups: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              emoji: { type: Type.STRING },
              points: { type: Type.INTEGER },
              description: { type: Type.STRING }
            },
            required: ["name", "emoji", "points", "description"]
          }
        }
      },
      required: [
        "gameTemplate",
        "rationale",
        "backgroundTheme",
        "primaryGameColor",
        "secondaryGameColor",
        "mappedCollectibles",
        "mappedHazards",
        "mappedPowerups"
      ]
    };

    const locationDetails = location
      ? `Latitude: ${location.latitude}, Longitude: ${location.longitude}`
      : "Not provided";

    const constructorInstruction = `You are Agent 3 (Constructor Agent). Your purpose is to choose the single most appropriate game mechanics template based on the visual facts extracted by Agent 1 and details from Agent 2. Do NOT just default to Falling items! Pick the style that matches the group best.

Choose among these 4 templates:
1. 'GatheringCollectAdventure' (falling items / basket catching): best suited for general indoor chats, drinks, and casual food-centric get-togethers.
2. 'MemoryLaneTreasureHunt' (side-scroller jumper): best suited for active, standing poses, outdoor landscapes, stairs or line-based group arrays.
3. 'VibeMazeQuest' (retro corridors Pac-man grid quest): best suited for office workspaces, structured desks, computers, retro geeks, smart patterns, or indoor building maps.
4. 'LaserVibeProtector' (upward retro base shooter): best suited for pointing gestures, high energy expressions, flashing colors, neon or futuristic/cyberpunk setups.

Extracted Facts from Agent 1 and Cartoon styling:
- Background: ${extractionResult.detectedBackground}
- Objects: ${JSON.stringify(extractionResult.detectedObjects || [])}
- Participants apparel and identity: ${JSON.stringify(assetResult.participantsWithAssets?.map((p: any) => ({ name: p.detectedName, apparel: p.apparelDescription, color: p.clothingColor })) || [])}

Location details:
${locationDetails}

Select a gameTemplate, map relevant physical props into collectibles, powerups or hazards, and select color profiles. Respect the responseSchema structure.`;

    const responseAgent3 = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [{ text: constructorInstruction }],
      config: {
        responseMimeType: "application/json",
        responseSchema: constructorSchema,
        temperature: 0.7,
      }
    });

    const constructorResult = JSON.parse(responseAgent3.text?.trim() || "{}");
    console.log("[Agent 3] Game structure designed:", JSON.stringify(constructorResult, null, 2));
    sendStep("agent3", "completed", constructorResult);


    // ==========================================
    // AGENT 4: GENERATOR AGENT (Full Config Assembler)
    // ==========================================
    console.log("[Agent 4] Initializing Generator Agent...");

    const generatorSchema = {
      type: Type.OBJECT,
      properties: {
        vibeTitle: { type: Type.STRING, description: "A stylish 2-4 word energetic title summarizing the team." },
        vibeDescription: { type: Type.STRING, description: "A witty, extremely detailed observation of the crew's style and visual chemistry." },
        groupThemeColors: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "List of exactly 3 contrasting brand Hex colors."
        },
        detectedActivity: { type: Type.STRING },
        funFact: { type: Type.STRING, description: "Playful, lighthearted roast about who seems the most mischievous or energetic." },
        gameConfig: {
          type: Type.OBJECT,
          properties: {
            gameTitle: { type: Type.STRING, description: "Custom, hilarious name fitting the template choice." },
            subtitle: { type: Type.STRING },
            dialogueIntro: { type: Type.STRING, description: "Witty preamble explaining how the crew got trapped in this quest based on their objects." },
            gameTemplate: { type: Type.STRING },
            backdropType: { type: Type.STRING },
            backdropSvg: { type: Type.STRING, description: "Direct pass-through of the beautiful custom backdrop SVG generated in Agent 2" },
            primaryColor: { type: Type.STRING },
            secondaryColor: { type: Type.STRING },
            gameSpeed: { type: Type.NUMBER },
            targetScore: { type: Type.INTEGER },
            locationContextName: { type: Type.STRING, description: "Local name corresponding to coordinates (e.g. 'SOMA Tech Alley', 'Mission District Cafe')." },
            spawnItems: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  emoji: { type: Type.STRING },
                  type: { type: Type.STRING },
                  points: { type: Type.INTEGER },
                  description: { type: Type.STRING }
                },
                required: ["name", "emoji", "type", "points", "description"]
              }
            }
          },
          required: [
            "gameTitle",
            "subtitle",
            "dialogueIntro",
            "gameTemplate",
            "backdropType",
            "backdropSvg",
            "primaryColor",
            "secondaryColor",
            "gameSpeed",
            "targetScore",
            "locationContextName",
            "spawnItems"
          ]
        },
        participants: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.INTEGER },
              detectedName: { type: Type.STRING },
              avatarEmoji: { type: Type.STRING },
              emotion: { type: Type.STRING },
              apparelDescription: { type: Type.STRING },
              clothingColor: { type: Type.STRING },
              hasGlasses: { type: Type.BOOLEAN },
              score: { type: Type.INTEGER },
              photoIndex: { type: Type.INTEGER },
              faceBox: {
                type: Type.ARRAY,
                items: { type: Type.INTEGER }
              },
              cartoonSvg: { type: Type.STRING, description: "Direct pass-through of the cartoonSvg string generated in Agent 2." }
            },
            required: ["id", "detectedName", "avatarEmoji", "emotion", "apparelDescription", "clothingColor", "hasGlasses", "score", "photoIndex", "faceBox", "cartoonSvg"]
          }
        }
      },
      required: [
        "vibeTitle",
        "vibeDescription",
        "groupThemeColors",
        "detectedActivity",
        "funFact",
        "gameConfig",
        "participants"
      ]
    };

    const generatorInstruction = `You are Agent 4 (Generator Agent), the master social game config synthesizer.
Your task is to merge the factual audit from Agent 1, the beautiful visual designs from Agent 2, with the mechanical template and item mapping decisions from Agent 3 into a cohesive, production-ready payload.

Extracted Facts (Agent 1):
${JSON.stringify(extractionResult, null, 2)}

strategic Game Design (Agent 3):
${JSON.stringify(constructorResult, null, 2)}

Participants and Visual Assets from Agent 2:
- Participants with Cartoon SVGs: ${JSON.stringify(assetResult.participantsWithAssets || [], null, 2)}
- Generated Background Backdrop Landscape SVG: ${assetResult.backdropSvg || ""}

You MUST:
1. Synthesize all objects into the array of 'spawnItems' (properly setting types to 'collectable', 'hazard', or 'powerup').
2. Map each participant from Agent 2's 'participantsWithAssets' list, keeping their 'cartoonSvg' string exactly intact, and initializing their scores to 0.
3. Populate dialogueIntro, gameTitle, and locationContextName with high-level humor and custom references.
4. Keep gameTemplate, backdropType, primaryColor, and secondaryColor exactly equal to Agent 3's choices to honor their design rules.
5. Set 'backdropSvg' under 'gameConfig' to the exact custom backdrop landscape SVG generated by Agent 2. Make sure it is copied exactly and is not left empty!
Return the complete schema strictly in JSON matching the responseSchema.`;

    const responseAgent4 = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [{ text: generatorInstruction }],
      config: {
        responseMimeType: "application/json",
        responseSchema: generatorSchema,
        temperature: 0.9,
      }
    });

    const finalResult = JSON.parse(responseAgent4.text?.trim() || "{}");
    console.log("[Multi-Agent] Compilation succeeded. Returning final schema.");
    sendStep("agent4", "completed", finalResult);
    res.end();

  } catch (error: any) {
    console.error("Gemini Multi-Agent Pipeline Error:", error);
    if (res.headersSent) {
      res.write(JSON.stringify({ step: "error", message: error?.message || error }) + "\n");
      res.end();
    } else {
      return res.status(500).json({
        error: "Error orchestrating game generation: " + (error?.message || error)
      });
    }
  }
});

// Setup dev server vs production server static builders
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Hangout] Full-stack server running model gemini-3.5-flash on port ${PORT}`);
  });
}

startServer();
