const fs = require('fs');
const path = require('path');

function detectSentimentJS(text) {
  if (!text || !text.trim()) return null;

  const positiveEmojis = new Set(['😊','😃','😄','😁','🙂','😀','😍','🥰','😘','🤗','🎉','👍','❤️','💖','✨','🌟','💯']);
  const negativeEmojis = new Set(['😢','😭','😞','😔','☹️','🙁','😣','😖','😫','😩','😤','😠','😡','💔','👎']);
  const neutralEmojis = new Set(['😐','😑','🤔','😶','🙄','🤷']);

  let posEmoji = 0, negEmoji = 0, neuEmoji = 0;
  for (const ch of Array.from(text)) {
    if (positiveEmojis.has(ch)) posEmoji++;
    else if (negativeEmojis.has(ch)) negEmoji++;
    else if (neutralEmojis.has(ch)) neuEmoji++;
  }
  const totalEmoji = posEmoji + negEmoji + neuEmoji;

  const normalize = s => s.toLowerCase().replace(/[^a-z0-9'\s]/g, ' ');
  const tokens = normalize(text).split(/\s+/).filter(Boolean);

  const positiveWords = new Set(["good","great","awesome","amazing","love","loved","like","liked","fantastic","excellent","best","nice","happy","joy","glad","wonderful","helpful","brilliant","recommend","cool"]);
  const negativeWords = new Set(["bad","terrible","awful","hate","hated","dislike","disliked","worst","poor","sad","angry","disappointed","disappointing","broken","bug","spam","boring","annoying","trash","waste"]);
  const negations = new Set(["not","never","no","dont","doesnt","didnt","isnt","wasnt","cant","cannot","wont","won't"]);
  const intensifiers = new Set(["very","really","extremely","super","totally","completely","absolutely","so"]);

  let score = 0;
  for (let i = 0; i < tokens.length; i++) {
    const w = tokens[i];
    if (positiveWords.has(w)) {
      let weight = 1;
      if (i > 0 && intensifiers.has(tokens[i-1])) weight *= 1.6;
      if (i > 0 && negations.has(tokens[i-1])) weight *= -1;
      score += weight;
    } else if (negativeWords.has(w)) {
      let weight = -1;
      if (i > 0 && intensifiers.has(tokens[i-1])) weight *= 1.6;
      if (i > 0 && negations.has(tokens[i-1])) weight *= -1;
      score += weight;
    }
  }

  const wordSentiment = score > 0.5 ? 'positive' : score < -0.5 ? 'negative' : 'neutral';
  const wordMagnitude = Math.abs(score);
  const wordConfidence = Math.min(0.95, 0.6 + Math.min(1, wordMagnitude / Math.max(1, Math.sqrt(tokens.length))) * 0.35);

  if (totalEmoji > 0) {
    const emojiSentiment = posEmoji > negEmoji && posEmoji > neuEmoji ? 'positive' : negEmoji > posEmoji && negEmoji > neuEmoji ? 'negative' : 'neutral';
    const emojiConfidenceBase = 0.75 + Math.min(0.2, totalEmoji / 10);
    const combinedConfidence = Math.min(0.98, emojiConfidenceBase * 0.75 + wordConfidence * 0.25);
    if (wordSentiment !== 'neutral' && wordSentiment === emojiSentiment) {
      return { sentiment: emojiSentiment, confidence: Math.min(0.99, combinedConfidence + 0.03) };
    }
    if (Math.abs(posEmoji - negEmoji) >= 1) {
      return { sentiment: emojiSentiment, confidence: combinedConfidence };
    }
    return { sentiment: wordSentiment, confidence: wordConfidence };
  }

  if (tokens.length === 0) return null;
  return { sentiment: wordSentiment, confidence: wordConfidence };
}

const csvPath = path.join(__dirname, '..', 'YoutubeCommentsDataSet.csv');
const raw = fs.readFileSync(csvPath, 'utf8');
const lines = raw.split(/\r?\n/).filter(Boolean);
if (lines.length <= 1) {
  console.error('No data found in CSV');
  process.exit(1);
}

lines.shift(); // header

let total = 0, correct = 0;
const mismatches = [];
for (const line of lines) {
  const idx = line.lastIndexOf(',');
  if (idx === -1) continue;
  const comment = line.slice(0, idx).trim();
  const label = line.slice(idx + 1).trim().toLowerCase();
  const detected = detectSentimentJS(comment);
  const pred = detected ? detected.sentiment : 'neutral';
  total++;
  if (pred === label) correct++;
  else if (mismatches.length < 10) mismatches.push({ comment: comment.slice(0,200), label, pred, confidence: detected ? detected.confidence : 0 });
}

console.log(`Evaluated ${total} rows. Accuracy: ${(correct/total*100).toFixed(2)}% (${correct}/${total})`);
if (mismatches.length) {
  console.log('\nSample mismatches:');
  mismatches.forEach((m,i) => {
    console.log(`\n${i+1}) label=${m.label} pred=${m.pred} conf=${(m.confidence*100||0).toFixed(1)}%`);
    console.log(m.comment);
  });
}

process.exit(0);
