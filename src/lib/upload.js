import supabase from "./supabase";

const uploadWithProgress = async (file, onProgress) => {
  const date = new Date();
  const fileName = `${date.getTime()}_${file.name}`;

  const { error } = await supabase.storage
    .from("avatars")
    .upload(fileName, file, {
      cacheControl: "3600", // Cache for 1 hour
      upsert: true,
      onUploadProgress: (progressEvent) => {
        const progress = Math.round(
          (progressEvent.loaded / progressEvent.total) * 100,
        );
        onProgress(progress);
      },
    });

  if (error) {
    throw new Error("Something went wrong! " + error.message);
  }

  const { data: fileData } = supabase.storage
    .from("avatars")
    .getPublicUrl(fileName);

  return fileData.publicUrl;
};

export default uploadWithProgress;
