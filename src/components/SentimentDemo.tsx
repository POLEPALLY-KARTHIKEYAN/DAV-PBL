import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Loader2, SmilePlus, Meh, Frown } from "lucide-react";
import { toast } from "sonner";
import { detectSentiment } from "@/lib/detectSentiment";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export const SentimentDemo = () => {
  const [comment, setComment] = useState("");
  const [result, setResult] = useState<{
    sentiment: "positive" | "neutral" | "negative";
    confidence: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [chartData, setChartData] = useState<Array<{name: string; confidence: number}>>([]);
  const [datasetChartData, setDatasetChartData] = useState<Array<{name: string; count: number}>>([]);
  const [avgChartData, setAvgChartData] = useState<Array<{name: string; confidence: number}>>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  // detector moved to `src/lib/detectSentiment.ts` and is imported above

  const analyzeSentiment = async () => {
    if (!comment.trim()) {
      toast.error("Please enter a comment to analyze");
      return;
    }

    setLoading(true);
    
    // Use improved detector (combines emojis + lexicon)
    setTimeout(() => {
      const detected = detectSentiment(comment);
      if (detected) {
        setResult(detected);
        // Update chart data with new results
        const newChartData = [
          { name: 'Positive', confidence: detected.sentiment === 'positive' ? detected.confidence : 0 },
          { name: 'Neutral', confidence: detected.sentiment === 'neutral' ? detected.confidence : 0 },
          { name: 'Negative', confidence: detected.sentiment === 'negative' ? detected.confidence : 0 }
        ];
        setChartData(newChartData);
      }
      else toast.error("Couldn't detect sentiment. Try a longer comment or add some context/emojis.");
      setLoading(false);
    }, 600);
  };

  // --- CSV upload & processing ---
  const parseCSVText = (text: string) => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
    if (lines.length === 0) return [] as string[];

    const header = lines[0].split(/,\s*/).map(h => h.replace(/^"|"$/g, '').toLowerCase());
    let commentIdx = -1;
    for (let i = 0; i < header.length; i++) {
      const h = header[i];
      if (h.includes('comment') || h.includes('text') || h.includes('content')) {
        commentIdx = i;
        break;
      }
    }
    const start = commentIdx === -1 ? 0 : 1; // if no header-match, assume first column and no header
    const rowsStart = commentIdx === -1 ? 0 : 1;

    const comments: string[] = [];
    for (let i = rowsStart; i < lines.length; i++) {
      const cols = lines[i].split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/).map(c => c.replace(/^"|"$/g, '').trim());
      if (cols.length === 0) continue;
      const textVal = commentIdx >= 0 ? cols[commentIdx] : cols[0];
      if (textVal && textVal.trim() !== '') comments.push(textVal);
    }
    return comments;
  };

  const handleFile = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      const comments = parseCSVText(text);
      if (comments.length === 0) {
        toast.error('No comments found in the uploaded CSV.');
        return;
      }
      processComments(comments);
    };
    reader.onerror = () => {
      toast.error('Failed to read file');
    };
    reader.readAsText(file);
  };

  const processComments = async (comments: string[]) => {
    setProcessing(true);
    setProgress({ done: 0, total: comments.length });

    const counts = { positive: 0, neutral: 0, negative: 0 } as Record<string, number>;
    const confSums = { positive: 0, neutral: 0, negative: 0 } as Record<string, number>;

    const chunkSize = 200; // process in chunks to keep UI responsive
    for (let i = 0; i < comments.length; i += chunkSize) {
      const chunk = comments.slice(i, i + chunkSize);
      for (const c of chunk) {
        try {
          const detected = detectSentiment(c);
          if (detected) {
            counts[detected.sentiment] += 1;
            confSums[detected.sentiment] += detected.confidence;
          }
        } catch (e) {
          // ignore single-row errors
        }
      }
      setProgress(p => ({ ...p, done: Math.min(comments.length, i + chunk.length) }));
      // yield to UI
      await new Promise((res) => setTimeout(res, 10));
    }

    const datasetData = [
      { name: 'Positive', count: counts.positive },
      { name: 'Neutral', count: counts.neutral },
      { name: 'Negative', count: counts.negative },
    ];
    setDatasetChartData(datasetData);

    const avgData = [
      { name: 'Positive', confidence: counts.positive ? confSums.positive / counts.positive : 0 },
      { name: 'Neutral', confidence: counts.neutral ? confSums.neutral / counts.neutral : 0 },
      { name: 'Negative', confidence: counts.negative ? confSums.negative / counts.negative : 0 }
    ];
    setAvgChartData(avgData);

    setProcessing(false);
    toast.success(`Processed ${comments.length} comments`);
  };

  const getSentimentIcon = () => {
    if (!result) return null;
    
    switch (result.sentiment) {
      case "positive":
        return <SmilePlus className="w-16 h-16 text-green-400" />;
      case "neutral":
        return <Meh className="w-16 h-16 text-yellow-400" />;
      case "negative":
        return <Frown className="w-16 h-16 text-red-400" />;
    }
  };

  const getSentimentColor = () => {
    if (!result) return "";
    
    switch (result.sentiment) {
      case "positive":
        return "from-green-500/20 to-emerald-500/20 border-green-500/30";
      case "neutral":
        return "from-yellow-500/20 to-amber-500/20 border-yellow-500/30";
      case "negative":
        return "from-red-500/20 to-rose-500/20 border-red-500/30";
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Textarea
          placeholder="Enter a YouTube comment here to analyze its sentiment..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="min-h-32 resize-none bg-card/50 backdrop-blur-sm border-primary/20 focus:border-primary/50 transition-colors"
        />
        <Button
          onClick={analyzeSentiment}
          disabled={loading}
          className="w-full bg-gradient-primary hover-glow"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            "Analyze Sentiment"
          )}
        </Button>
      </div>

      {result && (
        <>
          <Card 
            className={`p-6 bg-gradient-to-br ${getSentimentColor()} backdrop-blur-sm animate-scale-in`}
          >
            <div className="flex flex-col items-center text-center space-y-4">
              {getSentimentIcon()}
              <div>
                <h3 className="text-2xl font-bold capitalize mb-2">{result.sentiment}</h3>
                <p className="text-muted-foreground">
                  Confidence: {(result.confidence * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </Card>

          {chartData.length > 0 && (
            <Card className="p-6">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 1]} tickFormatter={(value) => `${(value * 100).toFixed(0)}%`} />
                  <Tooltip formatter={(value) => `${(Number(value) * 100).toFixed(1)}%`} />
                  <Bar
                    dataKey="confidence"
                    fill="#2563eb"
                    animationDuration={1000}
                  />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}
        </>
      )}
    </div>
  );
};
