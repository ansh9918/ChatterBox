import { toast } from "react-toastify";
import supabase from "./supabase";

// Function to upload the file to a user-specific folder in Supabase storage
const upload = async (file, uid) => {
  // Create a file path with the user's UID as a folder
  const date = new Date();
  const fileName = `${date.getTime()}_${file.name}`;
  const filePath = `${uid}/${fileName}`;

  try {
    const { error } = await supabase.storage
      .from("data")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) throw error;
    toast.success("Upload successful");
    // console.log("Upload successful");
  } catch (error) {
    console.error("Upload error:", error.message);
  }

  // Get the public URL of the uploaded file
  const { data: fileUrl, error: urlError } = supabase.storage
    .from("data")
    .getPublicUrl(filePath);

  if (urlError) {
    toast.error("Error getting public URL: " + urlError.message);
    throw new Error("Error getting public URL: " + urlError.message);
  }

  return fileUrl.publicUrl;
};

export default upload;
