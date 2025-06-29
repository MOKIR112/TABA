import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Upload, X, Plus, MapPin } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { storage } from "@/lib/storage";

export default function CreateListing() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    condition: "",
    location: "",
    wantedItems: [] as string[],
  });

  const [images, setImages] = useState<File[]>([]);
  const [wantedItemInput, setWantedItemInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = [
    "Electronics",
    "Furniture",
    "Clothing",
    "Books",
    "Sports",
    "Music",
    "Art",
    "Tools",
    "Home & Garden",
    "Toys & Games",
    "Automotive",
    "Other",
  ];

  const conditions = ["New", "Like New", "Excellent", "Good", "Fair", "Poor"];

  // Fetch existing listing if editing
  const { data: existingListing } = useQuery({
    queryKey: ["listing", id],
    queryFn: () => api.listings.getById(id!),
    enabled: isEditing && !!id,
  });

  // Populate form with existing data
  useEffect(() => {
    if (existingListing) {
      setFormData({
        title: existingListing.title || "",
        description: existingListing.description || "",
        category: existingListing.category || "",
        condition: existingListing.condition || "",
        location: existingListing.location || "",
        wantedItems: existingListing.wanted_items || [],
      });
    }
  }, [existingListing]);

  // Create/Update listing mutation
  const createListingMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!user) throw new Error("User not authenticated");

      // Ensure user exists in database first
      try {
        await api.users.getById(user.id);
      } catch (error) {
        // Create user if doesn't exist
        await api.users.create({
          id: user.id,
          email: user.email!,
          name: user.user_metadata?.name || null,
          avatar: user.user_metadata?.avatar_url || null,
          location: null,
          bio: null,
          phone: null,
          email_verified: user.email_confirmed_at ? true : false,
          phone_verified: false,
        });
      }

      // Upload images if any
      let imageUrls: string[] = [];
      if (data.images && data.images.length > 0) {
        try {
          // Ensure listings bucket exists
          await storage.ensureBucketExists("listings");
          imageUrls = await storage.uploadMultipleImages(
            data.images,
            "listings",
          );
        } catch (error) {
          console.error("Error uploading images:", error);
          throw new Error("Failed to upload images");
        }
      }

      const listingData = {
        title: data.title,
        description: data.description,
        category: data.category,
        condition: data.condition,
        location: data.location,
        wanted_items: data.wantedItems,
        user_id: user.id,
        images: imageUrls,
        status: "ACTIVE",
      };

      if (isEditing && id) {
        return api.listings.update(id, listingData);
      } else {
        return api.listings.create(listingData);
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["listings"] });
      queryClient.invalidateQueries({ queryKey: ["user-listings"] });

      toast({
        title: isEditing ? "Listing updated!" : "Listing created!",
        description: isEditing
          ? "Your listing has been successfully updated."
          : "Your listing is now live and visible to other users.",
      });

      navigate(`/listing/${data.id}`);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description:
          error.message || "Failed to save listing. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (images.length + files.length > 5) {
      alert("You can upload a maximum of 5 images");
      return;
    }
    setImages((prev) => [...prev, ...files]);
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const addWantedItem = () => {
    if (
      wantedItemInput.trim() &&
      !formData.wantedItems.includes(wantedItemInput.trim())
    ) {
      setFormData((prev) => ({
        ...prev,
        wantedItems: [...prev.wantedItems, wantedItemInput.trim()],
      }));
      setWantedItemInput("");
    }
  };

  const removeWantedItem = (item: string) => {
    setFormData((prev) => ({
      ...prev,
      wantedItems: prev.wantedItems.filter((i) => i !== item),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to create a listing.",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    if (
      !formData.title ||
      !formData.description ||
      !formData.category ||
      !formData.condition ||
      !formData.location
    ) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    // Check for monetary keywords
    const content = `${formData.title} ${formData.description}`.toLowerCase();
    const monetaryKeywords = [
      "sell",
      "money",
      "cash",
      "payment",
      "buy",
      "price",
      "cost",
    ];
    const hasMonetaryKeywords = monetaryKeywords.some((keyword) =>
      content.includes(keyword),
    );

    if (hasMonetaryKeywords) {
      toast({
        title: "TABADOL is cash-free!",
        description:
          "Please describe what you'd like to trade instead of using monetary terms.",
        variant: "destructive",
      });
      return;
    }

    createListingMutation.mutate({ ...formData, images });
  };

  return (
    <div className="bg-background min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-4 font-blinker">
              {isEditing ? "Edit Listing" : "Create New Listing"}
            </h1>
            <p className="text-xl text-muted-foreground">
              {isEditing
                ? "Update your listing details"
                : "Share what you want to trade"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    name="title"
                    placeholder="What are you trading?"
                    value={formData.title}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Describe your item in detail..."
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={4}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category *</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) =>
                        handleSelectChange("category", value)
                      }
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem
                            key={category}
                            value={category.toLowerCase()}
                          >
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Condition *</Label>
                    <Select
                      value={formData.condition}
                      onValueChange={(value) =>
                        handleSelectChange("condition", value)
                      }
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select condition" />
                      </SelectTrigger>
                      <SelectContent>
                        {conditions.map((condition) => (
                          <SelectItem
                            key={condition}
                            value={condition.toLowerCase()}
                          >
                            {condition}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location *</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="location"
                      name="location"
                      placeholder="City, State"
                      value={formData.location}
                      onChange={handleInputChange}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Images */}
            <Card>
              <CardHeader>
                <CardTitle>Photos</CardTitle>
                <p className="text-sm text-gray-600">
                  Add up to 5 photos to showcase your item
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {images.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {images.map((image, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={URL.createObjectURL(image)}
                            alt={`Upload ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {images.length < 5 && (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-tabadol-purple transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                        className="hidden"
                        id="image-upload"
                      />
                      <label htmlFor="image-upload" className="cursor-pointer">
                        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 mb-2">
                          Click to upload photos
                        </p>
                        <p className="text-sm text-gray-500">
                          PNG, JPG up to 10MB each
                        </p>
                      </label>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* What You Want */}
            <Card>
              <CardHeader>
                <CardTitle>What are you looking for?</CardTitle>
                <p className="text-sm text-gray-600">
                  Add items you'd like to receive in exchange
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., Laptop, Books, Art supplies"
                    value={wantedItemInput}
                    onChange={(e) => setWantedItemInput(e.target.value)}
                    onKeyPress={(e) =>
                      e.key === "Enter" && (e.preventDefault(), addWantedItem())
                    }
                  />
                  <Button type="button" onClick={addWantedItem}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                {formData.wantedItems.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.wantedItems.map((item, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="cursor-pointer hover:bg-red-100"
                        onClick={() => removeWantedItem(item)}
                      >
                        {item}
                        <X className="w-3 h-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Submit */}
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => navigate(-1)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 btn-gradient"
                disabled={createListingMutation.isPending}
              >
                {createListingMutation.isPending
                  ? "Publishing..."
                  : isEditing
                    ? "Update Listing"
                    : "Publish Listing"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
