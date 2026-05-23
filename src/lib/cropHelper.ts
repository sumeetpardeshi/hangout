/**
 * Helper to crop a face from any base64 original image
 * using standard HTML Canvas on the client side.
 * faceBox: [ymin, xmin, ymax, xmax] scaled from 0 to 1000
 */
export function cropFaceFromImage(
  base64Image: string,
  faceBox: [number, number, number, number] | undefined
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!faceBox || faceBox.length !== 4) {
      return reject(new Error("Invalid face bounding box coordinates."));
    }

    const img = new Image();
    img.src = base64Image;
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        const [ymin, xmin, ymax, xmax] = faceBox;

        // Convert 0-1000 scaling back to real pixel dimension coordinates
        const x = (xmin / 1000) * img.width;
        const y = (ymin / 1000) * img.height;
        const width = ((xmax - xmin) / 1000) * img.width;
        const height = ((ymax - ymin) / 1000) * img.height;

        // Guard against zero dimensions
        if (width <= 0 || height <= 0) {
          return resolve(base64Image); // fallback to original
        }

        // Create a square cropping bounding context
        const size = Math.max(width, height);
        // Center the crop box slightly and add a 15% padding area for safety/hair/context
        const padding = size * 0.22;
        
        const cropX = Math.max(0, x - padding);
        const cropY = Math.max(0, y - padding);
        const cropSize = Math.min(
          size + padding * 2,
          img.width - cropX,
          img.height - cropY
        );

        const canvas = document.createElement("canvas");
        canvas.width = 120; // 120x120 is perfect size for high density Canvas avatars
        canvas.height = 120;

        const ctx = canvas.getContext("2d");
        if (ctx) {
          // Circular mask
          ctx.beginPath();
          ctx.arc(60, 60, 60, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();

          // Draw the cropped portion
          ctx.drawImage(
            img,
            cropX,
            cropY,
            cropSize,
            cropSize,
            0,
            0,
            120,
            120
          );

          // Return base64cropped source
          resolve(canvas.toDataURL("image/png"));
        } else {
          resolve(base64Image);
        }
      } catch (e) {
        console.warn("Face crop execution failed:", e);
        resolve(base64Image);
      }
    };

    img.onerror = (err) => {
      console.warn("Image loading failure for crop source:", err);
      resolve(base64Image);
    };
  });
}
