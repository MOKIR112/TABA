import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, CheckCircle } from "lucide-react";

export default function UserRating() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Mock trade data - in real app, fetch based on trade ID
  const tradeData = {
    id: 1,
    otherUser: {
      id: id || "1",
      name: "Sarah Johnson",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah",
    },
    myItem: {
      title: "Professional Camera Kit",
      image:
        "https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=200&q=80",
    },
    theirItem: {
      title: "MacBook Pro 2021",
      image:
        "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=200&q=80",
    },
    completedDate: "2024-01-15",
    location: "San Francisco, CA",
  };

  const ratingLabels = {
    1: "Poor",
    2: "Fair",
    3: "Good",
    4: "Very Good",
    5: "Excellent",
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      alert("Please select a rating");
      return;
    }

    setIsSubmitting(true);

    try {
      // Handle rating submission here
      console.log("Submitting rating:", {
        userId: tradeData.otherUser.id,
        tradeId: tradeData.id,
        rating,
        comment,
      });

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setIsSubmitted(true);
    } catch (error) {
      console.error("Error submitting rating:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinish = () => {
    navigate("/trade-history");
  };

  if (isSubmitted) {
    return (
      <div className="bg-background min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-4 font-blinker">
              Rating Submitted!
            </h2>
            <p className="text-gray-600 mb-6">
              Thank you for your feedback. Your rating helps build trust in our
              community.
            </p>
            <Button onClick={handleFinish} className="btn-gradient w-full">
              Continue
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-3xl md:text-4xl font-bold mb-4 font-blinker text-white">
              Rate Your Trade
            </h1>
            <p className="text-xl text-white">
              How was your experience trading with {tradeData.otherUser.name}?
            </p>
          </div>

          {/* Trade Summary */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-center text-white">Trade Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center mb-6">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={tradeData.otherUser.avatar} />
                  <AvatarFallback className="text-xl">
                    {tradeData.otherUser.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </div>
              <h3 className="text-xl font-semibold text-center mb-6 font-blinker text-white">
                {tradeData.otherUser.name}
              </h3>

              {/* Trade Items */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="text-center">
                  <h4 className="font-medium mb-3 text-white">You Traded</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <img
                      src={tradeData.myItem.image}
                      alt={tradeData.myItem.title}
                      className="w-20 h-20 object-cover rounded-lg mx-auto mb-3"
                    />
                    <p className="font-medium text-sm text-white">
                      {tradeData.myItem.title}
                    </p>
                  </div>
                </div>
                <div className="text-center">
                  <h4 className="font-medium mb-3 text-white">
                    You Received
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <img
                      src={tradeData.theirItem.image}
                      alt={tradeData.theirItem.title}
                      className="w-20 h-20 object-cover rounded-lg mx-auto mb-3"
                    />
                    <p className="font-medium text-sm text-white">
                      {tradeData.theirItem.title}
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-center text-sm text-white">
                Completed on{" "}
                {new Date(tradeData.completedDate).toLocaleDateString()} in{" "}
                {tradeData.location}
              </div>
            </CardContent>
          </Card>

          {/* Rating Form */}
          <Card>
            <CardContent className="p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Star Rating */}
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-4 font-blinker text-white">
                    Rate this trader
                  </h3>
                  <div className="flex justify-center space-x-2 mb-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        className="focus:outline-none transition-transform hover:scale-110"
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setRating(star)}
                      >
                        <Star
                          className={`w-10 h-10 ${
                            star <= (hoverRating || rating)
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-300 hover:text-yellow-400"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  {(hoverRating || rating) > 0 && (
                    <p className="text-lg font-medium text-tabadol-purple">
                      {
                        ratingLabels[
                          hoverRating || (rating as keyof typeof ratingLabels)
                        ]
                      }
                    </p>
                  )}
                </div>

                {/* Comment */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Share your experience (optional)
                  </label>
                  <Textarea
                    placeholder="Tell others about your trade experience..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={4}
                    className="resize-none text-white"
                  />
                  <p className="text-sm text-white mt-2">
                    Your review will help other traders make informed decisions.
                  </p>
                </div>

                {/* Submit Buttons */}
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
                    disabled={isSubmitting || rating === 0}
                  >
                    {isSubmitting ? "Submitting..." : "Submit Rating"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Tips */}
          <Card className="mt-6">
            <CardContent className="p-6">
              <h4 className="font-semibold mb-3 font-blinker">
                Rating Guidelines
              </h4>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>
                  • Consider communication, item condition, and meeting
                  punctuality
                </li>
                <li>• Be honest and constructive in your feedback</li>
                <li>
                  • Remember that ratings help build trust in our community
                </li>
                <li>• Your rating will be visible to other users</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
