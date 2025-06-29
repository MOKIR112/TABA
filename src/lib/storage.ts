import { supabase } from "./supabase";

export const storage = {
  async uploadImage(file: File, bucket: string = "listings"): Promise<string> {
    // Validate file type
    if (!file.type.startsWith("image/")) {
      throw new Error("File must be an image");
    }

    // Validate file size (max 10MB for regular images, 5MB for avatars)
    const maxSize = bucket === "avatars" ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      const maxSizeMB = maxSize / (1024 * 1024);
      throw new Error(`File size must be less than ${maxSizeMB}MB`);
    }

    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = bucket === "avatars" ? fileName : fileName;

    // Ensure bucket exists
    await this.ensureBucketExists(bucket);

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("Storage upload error:", error);
      throw new Error(error.message || "Failed to upload image");
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(filePath);

    return publicUrl;
  },

  async ensureBucketExists(bucketName: string): Promise<void> {
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets?.some(
        (bucket) => bucket.name === bucketName,
      );

      if (!bucketExists) {
        const { error } = await supabase.storage.createBucket(bucketName, {
          public: true,
          allowedMimeTypes: ["image/*"],
          fileSizeLimit: bucketName === "avatars" ? 5242880 : 10485760, // 5MB for avatars, 10MB for others
        });

        if (error && !error.message.includes("already exists")) {
          console.error(`Error creating bucket ${bucketName}:`, error);
        }
      }
    } catch (error) {
      console.warn(`Could not ensure bucket ${bucketName} exists:`, error);
    }
  },

  async uploadMultipleImages(
    files: File[],
    bucket: string = "listings",
  ): Promise<string[]> {
    const uploadPromises = files.map((file) => this.uploadImage(file, bucket));
    return Promise.all(uploadPromises);
  },

  async deleteImage(url: string, bucket: string = "listings"): Promise<void> {
    try {
      // Extract the file path from the URL
      const urlParts = url.split("/");
      const bucketIndex = urlParts.findIndex((part) => part === bucket);

      if (bucketIndex === -1) {
        console.warn("Could not find bucket in URL:", url);
        return;
      }

      const filePath = urlParts.slice(bucketIndex + 1).join("/");
      if (!filePath) {
        console.warn("Could not extract file path from URL:", url);
        return;
      }

      const { error } = await supabase.storage.from(bucket).remove([filePath]);

      if (error) {
        console.error("Storage delete error:", error);
        throw new Error(error.message || "Failed to delete image");
      }
    } catch (error) {
      console.error("Error deleting image:", error);
      // Don't throw here as it's not critical if old images can't be deleted
    }
  },
};
