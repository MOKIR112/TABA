import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  Shield,
  MessageCircle,
  Star,
  Users,
  Zap,
  Heart,
  Search,
  Plus,
  MapPin,
} from "lucide-react";

function Home() {
  const featuredListings = [
    {
      id: 1,
      title: "Professional Camera Kit",
      description: "Canon EOS R5 with lenses",
      image:
        "https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=400&q=80",
      category: "Electronics",
      location: "San Francisco, CA",
      wantedItems: ["Laptop", "Drone"],
    },
    {
      id: 2,
      title: "Vintage Guitar Collection",
      description: "3 acoustic guitars in excellent condition",
      image:
        "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&q=80",
      category: "Music",
      location: "Austin, TX",
      wantedItems: ["Amplifier", "Recording Equipment"],
    },
    {
      id: 3,
      title: "Home Gym Equipment",
      description: "Complete weight set with bench",
      image:
        "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=80",
      category: "Fitness",
      location: "Los Angeles, CA",
      wantedItems: ["Bicycle", "Outdoor Gear"],
    },
  ];

  const stats = [
    { number: "10K+", label: "Active Users" },
    { number: "25K+", label: "Successful Trades" },
    { number: "50+", label: "Categories" },
    { number: "4.8★", label: "User Rating" },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-24 px-4 md:px-8 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="trade.jpeg"
            alt="Trade"
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-eco-primary/5 to-transparent"></div>
        </div>
        <div className="max-w-6xl mx-auto text-center relative z-10">
          <div className="animate-fade-in">
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-8 font-blinker text-eco-forest">
              Trade What You Have for
              <span className="block mt-2 bg-gradient-to-r from-eco-primary to-eco-forest bg-clip-text text-transparent">
                What You Need
              </span>
            </h1>
            <p className="text-lg md:text-xl text-eco-forest/70 mb-10 max-w-3xl mx-auto leading-relaxed">
              Join thousands of users in the world's most trusted barter
              marketplace. No money needed – just fair trades.
            </p>
            
            {/* Trade Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
              {stats.map((stat, index) => (
                <div
                  key={index}
                  className="text-center p-6 rounded-xl bg-gradient-to-br from-eco-primary/5 to-eco-beige/20 backdrop-blur-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-eco-primary to-eco-forest bg-clip-text text-transparent mb-3 font-blinker">
                    {stat.number}
                  </div>
                  <div className="text-eco-forest/80 font-medium">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <Button
                className="bg-eco-primary hover:bg-eco-forest text-white text-lg px-10 py-4 rounded-2xl shadow-floating hover:shadow-glow-eco transition-all duration-300 hover:scale-105"
                asChild
              >
                <Link to="/listings">
                  <Search className="w-5 h-5 mr-2" />
                  Browse Listings
                </Link>
              </Button>
              <Button
                variant="outline"
                className="text-lg px-10 py-4 border-2 border-eco-primary/30 text-eco-forest hover:bg-eco-primary hover:text-white rounded-2xl backdrop-blur-sm transition-all duration-300 hover:scale-105"
                asChild
              >
                <Link to="/create-listing">
                  <Plus className="w-5 h-5 mr-2" />
                  Create Listing
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-4 md:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 font-blinker text-eco-forest">
              Making a Difference Together
            </h2>
            <p className="text-lg text-eco-forest/70 max-w-2xl mx-auto leading-relaxed">
              Every trade helps build a more sustainable future
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="text-center p-6 rounded-xl bg-gradient-to-br from-eco-primary/5 to-eco-beige/20 backdrop-blur-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-eco-primary to-eco-forest bg-clip-text text-transparent mb-3 font-blinker">
                  {stat.number}
                </div>
                <div className="text-eco-forest/80 font-medium">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* Environmental Impact */}
          <div className="bg-gradient-to-br from-eco-primary/8 to-eco-beige/15 rounded-3xl p-10 shadow-floating backdrop-blur-sm border border-eco-primary/10">
            <div className="text-center mb-10">
              <h3 className="text-2xl md:text-3xl font-bold text-eco-forest mb-4 font-blinker">
                Environmental Impact
              </h3>
              <p className="text-eco-forest/70 text-lg">
                Together, we're making a positive impact on our planet
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center p-6 rounded-xl bg-eco-soft/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
                <div className="text-3xl md:text-4xl font-bold text-eco-primary mb-3 font-blinker">
                  62.5 tons
                </div>
                <div className="text-eco-forest/80 font-medium">
                  Waste Diverted from Landfills
                </div>
              </div>
              <div className="text-center p-6 rounded-xl bg-eco-soft/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
                <div className="text-3xl md:text-4xl font-bold text-eco-primary mb-3 font-blinker">
                  31.2 tons
                </div>
                <div className="text-eco-forest/80 font-medium">
                  CO2 Emissions Saved
                </div>
              </div>
              <div className="text-center p-6 rounded-xl bg-eco-soft/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
                <div className="text-3xl md:text-4xl font-bold text-eco-primary mb-3 font-blinker">
                  25,000+
                </div>
                <div className="text-eco-forest/80 font-medium">
                  Items Given New Life
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recently Traded Items */}
      <section className="py-24 px-4 md:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 font-blinker text-eco-forest">
              Recently Traded Items
            </h2>
            <p className="text-lg text-eco-forest/70 max-w-2xl mx-auto leading-relaxed">
              See what our community has been trading - building trust through
              successful exchanges
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-8">
            {featuredListings.map((listing) => (
              <div
                key={listing.id}
                className="cursor-pointer group relative overflow-hidden rounded-2xl bg-gradient-to-br from-eco-soft/80 to-eco-beige/40 backdrop-blur-sm shadow-floating hover:shadow-glow-eco transition-all duration-300 hover:-translate-y-2 border-0"
              >
                <div className="absolute top-4 left-4 z-10">
                  <Badge className="bg-eco-primary text-white font-semibold shadow-floating hover:shadow-glow-eco rounded-full px-4 py-2">
                    ✓ Traded Successfully
                  </Badge>
                </div>
                <div className="relative overflow-hidden rounded-t-lg">
                  <img
                    src={listing.image}
                    alt={listing.title}
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300 rounded-t-2xl"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-t-2xl"></div>
                </div>
                <div className="p-6">
                  <h3 className="font-bold text-lg mb-3 font-blinker text-eco-forest">
                    {listing.title}
                  </h3>
                  <p className="text-eco-forest/70 mb-4 line-clamp-2 leading-relaxed">
                    {listing.description}
                  </p>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-eco-forest/60 flex items-center font-medium">
                      <MapPin className="w-4 h-4 mr-1" />
                      {listing.location}
                    </p>
                    <div className="flex items-center text-sm text-eco-primary font-semibold">
                      <Star className="w-4 h-4 mr-1 fill-current" />
                      Trade Complete
                    </div>
                  </div>
                  <div className="space-y-3 pt-3 border-t border-eco-forest/10">
                    <p className="text-sm font-semibold text-eco-forest">
                      Was exchanged for:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {listing.wantedItems.slice(0, 2).map((item, index) => (
                        <Badge
                          key={index}
                          className="bg-eco-primary/10 text-eco-primary border-0 text-xs font-medium rounded-full px-3 py-1"
                        >
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Button
              className="bg-eco-primary hover:bg-eco-forest text-white text-lg px-10 py-4 rounded-2xl shadow-floating hover:shadow-glow-eco transition-all duration-300 hover:scale-105"
              asChild
            >
              <Link to="/listings">
                Start Trading Now
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-4 md:px-8 bg-gradient-to-br from-eco-beige/10 to-eco-primary/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 font-blinker text-eco-forest">
              How TABADOL Works
            </h2>
            <p className="text-lg text-eco-forest/70 max-w-2xl mx-auto leading-relaxed">
              Simple, secure, and fair trading in three easy steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center group p-8 rounded-2xl bg-gradient-to-br from-eco-soft/60 to-eco-beige/30 backdrop-blur-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <div className="w-20 h-20 bg-gradient-to-br from-eco-primary to-eco-forest rounded-full mx-auto mb-6 flex items-center justify-center group-hover:scale-110 transition-transform shadow-floating">
                <Plus className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-4 font-blinker text-eco-forest">
                1. List Your Item
              </h3>
              <p className="text-eco-forest/70 leading-relaxed">
                Create a listing with photos and describe what you want in
                return. It's completely free to list!
              </p>
            </div>

            <div className="text-center group p-8 rounded-2xl bg-gradient-to-br from-eco-soft/60 to-eco-beige/30 backdrop-blur-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <div className="w-20 h-20 bg-gradient-to-br from-eco-primary to-eco-forest rounded-full mx-auto mb-6 flex items-center justify-center group-hover:scale-110 transition-transform shadow-floating">
                <MessageCircle className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-4 font-blinker text-eco-forest">
                2. Connect & Chat
              </h3>
              <p className="text-eco-forest/70 leading-relaxed">
                Browse listings and message other users. Our secure chat keeps
                your conversations safe.
              </p>
            </div>

            <div className="text-center group p-8 rounded-2xl bg-gradient-to-br from-eco-soft/60 to-eco-beige/30 backdrop-blur-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <div className="w-20 h-20 bg-gradient-to-br from-eco-primary to-eco-forest rounded-full mx-auto mb-6 flex items-center justify-center group-hover:scale-110 transition-transform shadow-floating">
                <Zap className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-4 font-blinker text-eco-forest">
                3. Make the Trade
              </h3>
              <p className="text-eco-forest/70 leading-relaxed">
                Meet safely, exchange items, and rate each other. Build your
                reputation in the community.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-4 md:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 font-blinker text-eco-forest">
              Why Choose TABADOL?
            </h2>
            <p className="text-lg text-eco-forest/70 max-w-2xl mx-auto leading-relaxed">
              Built for trust, designed for community
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-eco-soft/60 to-eco-beige/30 backdrop-blur-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <Shield className="w-12 h-12 text-eco-primary mx-auto mb-6" />
              <h3 className="text-xl font-bold mb-4 font-blinker text-eco-forest">
                Secure & Safe
              </h3>
              <p className="text-eco-forest/70 leading-relaxed">
                User verification, secure messaging, and community ratings keep
                everyone safe.
              </p>
            </div>

            <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-eco-soft/60 to-eco-beige/30 backdrop-blur-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <Users className="w-12 h-12 text-eco-primary mx-auto mb-6" />
              <h3 className="text-xl font-bold mb-4 font-blinker text-eco-forest">
                Trusted Community
              </h3>
              <p className="text-eco-forest/70 leading-relaxed">
                Join thousands of verified users who have completed successful
                trades.
              </p>
            </div>

            <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-eco-soft/60 to-eco-beige/30 backdrop-blur-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <Star className="w-12 h-12 text-eco-primary mx-auto mb-6" />
              <h3 className="text-xl font-bold mb-4 font-blinker text-eco-forest">
                Quality Assured
              </h3>
              <p className="text-eco-forest/70 leading-relaxed">
                Our rating system ensures quality trades and builds trust within
                the community.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 md:px-8 bg-gradient-to-br from-eco-primary to-eco-forest text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-8 font-blinker">
            Ready to Start Trading?
          </h2>
          <p className="text-lg md:text-xl mb-10 opacity-90 max-w-2xl mx-auto leading-relaxed">
            Join our community today and discover the joy of bartering. Your
            next great trade is just a click away!
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Button
              size="lg"
              className="bg-white text-eco-forest hover:bg-eco-soft px-10 py-4 text-lg font-semibold rounded-2xl shadow-floating hover:shadow-glow transition-all duration-300 hover:scale-105"
              asChild
            >
              <Link to="/signup">
                Get Started Free
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-2 border-white text-white hover:bg-white hover:text-eco-forest px-10 py-4 text-lg rounded-2xl backdrop-blur-sm transition-all duration-300 hover:scale-105"
              asChild
            >
              <Link to="/listings">Browse Listings</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;
