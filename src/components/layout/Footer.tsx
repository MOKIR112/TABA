import { Link } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Facebook,
  Twitter,
  Instagram,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";

export default function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="bg-gradient-dark text-white border-t border-border/20">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center">
              <img
                src="/taba png.png"
                alt="Tabadol Logo"
                className="h-12 w-auto drop-shadow-lg"
              />
            </div>
            <p className="text-gray-300 text-base leading-relaxed">
              The trusted marketplace for bartering goods and services. Trade
              what you have for what you need.
            </p>
            <div className="flex space-x-4">
              <a
                href="#"
                className="text-gray-400 hover:text-primary transition-all duration-300 hover:scale-110 hover:shadow-glow"
              >
                <Facebook className="w-6 h-6" />
              </a>
              <a
                href="#"
                className="text-gray-400 hover:text-primary transition-all duration-300 hover:scale-110 hover:shadow-glow"
              >
                <Twitter className="w-6 h-6" />
              </a>
              <a
                href="#"
                className="text-gray-400 hover:text-primary transition-all duration-300 hover:scale-110 hover:shadow-glow"
              >
                <Instagram className="w-6 h-6" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-bold text-xl mb-6 font-blinker gradient-text">
              Quick Links
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/listings"
                  className="text-gray-300 hover:text-primary transition-all duration-300 hover:translate-x-2"
                >
                  Browse Listings
                </Link>
              </li>
              <li>
                <Link
                  to="/create-listing"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Create Listing
                </Link>
              </li>
              <li>
                <Link
                  to="/how-it-works"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  How It Works
                </Link>
              </li>
              <li>
                <Link
                  to="/safety"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Safety Tips
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-bold text-xl mb-6 font-blinker gradient-text">
              Support
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/help"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Help Center
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Contact Us
                </Link>
              </li>
              <li>
                <Link
                  to="/terms"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  to="/privacy"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-bold text-xl mb-6 font-blinker gradient-text">
              Contact Info
            </h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-primary" />
                <span className="text-gray-300 text-base">
                  support@tabadol.com
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="w-5 h-5 text-primary" />
                <span className="text-gray-300 text-base">
                  +212 6 6543112
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <MapPin className="w-5 h-5 text-primary" />
                <span className="text-gray-300 text-base">
                  errachidia 
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-border/20 mt-12 pt-8 text-center">
          <p className="text-gray-300 text-base">
            {t('common.copyright', { year: new Date().getFullYear() })} 
            community.
          </p>
        </div>
      </div>
    </footer>
  );
}