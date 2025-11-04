import { SentimentDemo } from "@/components/SentimentDemo";
import { Brain } from "lucide-react";

const Demo = () => {
  return (
    <div className="min-h-screen py-20 px-4">
      <div className="container mx-auto max-w-3xl">
        <div className="text-center mb-12 animate-fade-in">
          <Brain className="w-12 h-12 text-secondary mx-auto mb-4" />
          <h2 className="text-4xl font-bold mb-4">Try It Yourself</h2>
          <p className="text-muted-foreground text-lg">
            Enter any YouTube comment and see our AI analyze its sentiment in real-time
          </p>
        </div>
        <SentimentDemo />
      </div>
    </div>
  );
};

export default Demo;