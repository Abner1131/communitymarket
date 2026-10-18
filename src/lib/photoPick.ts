import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

export type PickedPhoto = { uri: string; base64: string };

const MAX_SIDE = 1200; // the server makes the final 1000px + 400px versions
const JPEG_QUALITY = 0.8;

export class PhotoPickError extends Error {}

// Take a picture or choose one, crop it square, and shrink it so the upload
// is small and fast on mobile data. Returns null if the seller cancels.
export async function pickProductPhoto(
  source: "camera" | "library",
  opts: { what?: string; maxSide?: number } = {},
): Promise<PickedPhoto | null> {
  const what = opts.what ?? "product photos";
  const maxSide = opts.maxSide ?? MAX_SIDE;
  const permission =
    source === "camera"
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new PhotoPickError(
      source === "camera"
        ? `Allow camera access in your phone settings to take ${what}.`
        : `Allow photo access in your phone settings to choose ${what}.`,
    );
  }

  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ["images"],
    allowsEditing: true, // lets the seller crop to the product
    aspect: [1, 1],
    quality: 1, // we compress once, below
    exif: false,
  };
  const result =
    source === "camera"
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets || !result.assets[0]) return null;

  const asset = result.assets[0];
  const longest = Math.max(asset.width || 0, asset.height || 0);
  const context = ImageManipulator.manipulate(asset.uri);
  if (longest > maxSide) {
    context.resize(asset.width >= asset.height ? { width: maxSide } : { height: maxSide });
  }
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: JPEG_QUALITY, base64: true });
  if (!saved.base64) throw new PhotoPickError("Could not read that photo. Please try another.");
  return { uri: saved.uri, base64: saved.base64 };
}
