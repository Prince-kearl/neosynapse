import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  MessageCircle, 
  Phone, 
  Mail, 
  FileText,
  ChevronRight,
  HelpCircle,
  ShieldQuestion,
  Truck,
  CreditCard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "How do I track my order?",
    answer: "Go to the Orders tab to see real-time updates on your order status. You'll also receive notifications when your order status changes."
  },
  {
    question: "What payment methods are accepted?",
    answer: "We currently accept Cash on Delivery. Mobile money and card payments are coming soon!"
  },
  {
    question: "How do I cancel an order?",
    answer: "You can cancel an order within 5 minutes of placing it by going to Orders → Select the order → Cancel. After that, please contact support."
  },
  {
    question: "What if my order is late?",
    answer: "If your order is significantly delayed, you can contact the vendor directly or reach out to our support team for assistance."
  },
  {
    question: "How do I become a vendor?",
    answer: "Visit your Profile page and tap on 'Become a vendor' to start the application process. We'll review your application within 48 hours."
  },
];

const contactOptions = [
  { 
    icon: MessageCircle, 
    label: "Live Chat", 
    description: "Chat with our support team",
    action: "Start Chat"
  },
  { 
    icon: Phone, 
    label: "Call Us", 
    description: "+233 XX XXX XXXX",
    action: "Call"
  },
  { 
    icon: Mail, 
    label: "Email Support", 
    description: "support@chowpoint.com",
    action: "Email"
  },
];

const helpTopics = [
  { icon: Truck, label: "Delivery Issues", description: "Track, delays, or missing items" },
  { icon: CreditCard, label: "Payment Problems", description: "Refunds, failed payments" },
  { icon: ShieldQuestion, label: "Account & Security", description: "Login, privacy, data" },
  { icon: HelpCircle, label: "General Questions", description: "App usage, features" },
];

const Help = () => {
  const navigate = useNavigate();

  return (
    <div className="flex-1 min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)}
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-display text-xl font-bold">Help & Support</h1>
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto space-y-6">
        {/* Contact Options */}
        <section>
          <h2 className="font-display text-lg font-semibold text-foreground mb-3">
            Contact Us
          </h2>
          <div className="bg-card rounded-2xl shadow-food-card overflow-hidden">
            {contactOptions.map((option, index) => (
              <div key={option.label}>
                <button className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors text-left">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <option.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{option.label}</p>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                  </div>
                  <Button size="sm" variant="outline">{option.action}</Button>
                </button>
                {index < contactOptions.length - 1 && <Separator />}
              </div>
            ))}
          </div>
        </section>

        {/* Help Topics */}
        <section>
          <h2 className="font-display text-lg font-semibold text-foreground mb-3">
            Help Topics
          </h2>
          <div className="bg-card rounded-2xl shadow-food-card overflow-hidden">
            {helpTopics.map((topic, index) => (
              <div key={topic.label}>
                <button className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors text-left">
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                    <topic.icon className="w-5 h-5 text-secondary-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{topic.label}</p>
                    <p className="text-sm text-muted-foreground">{topic.description}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
                {index < helpTopics.length - 1 && <Separator />}
              </div>
            ))}
          </div>
        </section>

        {/* FAQs */}
        <section>
          <h2 className="font-display text-lg font-semibold text-foreground mb-3">
            Frequently Asked Questions
          </h2>
          <div className="bg-card rounded-2xl shadow-food-card p-4">
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* Legal Links */}
        <section>
          <h2 className="font-display text-lg font-semibold text-foreground mb-3">
            Legal
          </h2>
          <div className="bg-card rounded-2xl shadow-food-card overflow-hidden">
            <button className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors text-left">
              <FileText className="w-5 h-5 text-muted-foreground" />
              <span className="font-medium text-foreground">Terms of Service</span>
              <ChevronRight className="w-5 h-5 text-muted-foreground ml-auto" />
            </button>
            <Separator />
            <button className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors text-left">
              <FileText className="w-5 h-5 text-muted-foreground" />
              <span className="font-medium text-foreground">Privacy Policy</span>
              <ChevronRight className="w-5 h-5 text-muted-foreground ml-auto" />
            </button>
          </div>
        </section>

        {/* App Version */}
        <p className="text-center text-xs text-muted-foreground pb-4">
          ChowPoint v1.0.0
        </p>
      </div>
    </div>
  );
};

export default Help;
