import Header from "./Header";
import Footer from "./Footer";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-eco-soft via-eco-beige/10 to-eco-primary/5 transition-all duration-300 ease-in-out">
      <Header />
      <main className="flex-1 relative overflow-hidden">
        {/* Floating background elements */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl animate-float" />
        <div
          className="absolute bottom-20 right-10 w-48 h-48 bg-primary/3 rounded-full blur-3xl animate-float"
          style={{ animationDelay: "2s" }}
        />
        <div
          className="absolute top-1/2 left-1/3 w-24 h-24 bg-primary/4 rounded-full blur-2xl animate-float"
          style={{ animationDelay: "4s" }}
        />

        {/* Content container with fluid spacing */}
        <div className="relative z-10 fluid-container py-8">
          <div className="space-eco-md">{children}</div>
        </div>
      </main>
      <Footer />
    </div>
  );
}