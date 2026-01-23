
import { CandlestickData, SeriesMarker, UTCTimestamp } from 'lightweight-charts';

export interface PatternResult {
  markers: SeriesMarker<UTCTimestamp>[];
}

export function detectPatterns(data: CandlestickData[]): PatternResult {
  const markers: SeriesMarker<UTCTimestamp>[] = [];
  if (data.length < 10) return { markers };

  const isRed = (c: CandlestickData) => c.close < c.open;
  const isGreen = (c: CandlestickData) => c.close > c.open;
  const isDoji = (c: CandlestickData) => Math.abs(c.close - c.open) <= (c.high - c.low) * 0.1;
  const bodySize = (c: CandlestickData) => Math.abs(c.close - c.open);
  const upperWick = (c: CandlestickData) => c.high - Math.max(c.open, c.close);
  const lowerWick = (c: CandlestickData) => Math.min(c.open, c.close) - c.low;

  for (let i = 5; i < data.length; i++) {
    const c5 = data[i - 4];
    const c4 = data[i - 3];
    const c3 = data[i - 2];
    const c2 = data[i - 1];
    const curr = data[i];

    const time = curr.time as UTCTimestamp;
    let label = '';

    // 1. Bullish Engulfing
    if (isRed(c2) && isGreen(curr) && curr.open <= c2.close && curr.close >= c2.open) {
      label = 'B. ENGULFING';
    }
    // 2. Hammer
    else if (lowerWick(curr) > bodySize(curr) * 2 && upperWick(curr) < bodySize(curr) * 0.5) {
      label = 'HAMMER';
    }
    // 3. Inverted Hammer
    else if (upperWick(curr) > bodySize(curr) * 2 && lowerWick(curr) < bodySize(curr) * 0.5) {
      label = 'INV. HAMMER';
    }
    // 4. Morning Star
    else if (isRed(c3) && bodySize(c2) < bodySize(c3) * 0.3 && isGreen(curr) && curr.close > (c3.open + c3.close) / 2) {
      label = 'MORNING STAR';
    }
    // 5. Piercing Pattern
    else if (isRed(c2) && isGreen(curr) && curr.open < c2.low && curr.close > (c2.open + c2.close) / 2) {
      label = 'PIERCING';
    }
    // 6. Three White Soldiers
    else if (isGreen(c3) && isGreen(c2) && isGreen(curr) && curr.close > c2.close && c2.close > c3.close && bodySize(curr) > bodySize(curr) * 0.2) {
      label = '3 SOLDIERS';
    }
    // 7. Bullish Harami
    else if (isRed(c2) && isGreen(curr) && curr.open > c2.close && curr.close < c2.open) {
      label = 'HARAMI';
    }
    // 8. Tweezer Bottom
    else if (Math.abs(c2.low - curr.low) < (curr.high - curr.low) * 0.05 && isRed(c2) && isGreen(curr)) {
      label = 'TWEEZER BOTTOM';
    }
    // 9. Rising Three Methods
    else if (isGreen(c5) && isRed(c4) && isRed(c3) && isRed(c2) && isGreen(curr) && curr.close > c5.close && c4.low > c5.low && c2.low > c5.low) {
      label = 'RISING THREE';
    }
    // 10. Doji at Support
    else if (isDoji(c2) && isGreen(curr) && curr.close > c2.high) {
      label = 'DOJI CONFIRMED';
    }

    if (label) {
      markers.push({
        time,
        position: 'belowBar',
        color: '#2ebd85',
        shape: 'arrowUp',
        text: label,
      });
    }
  }

  return { markers };
}
