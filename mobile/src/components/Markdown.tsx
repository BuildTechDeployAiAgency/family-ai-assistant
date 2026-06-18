import { StyleSheet, Text, View } from 'react-native';

import { Brand, FontFamily } from '@/constants/theme';

// Lightweight markdown renderer for assistant replies — enough for what the
// agent emits: **bold**, `code`, bullet (-, *) and numbered (1.) lists, headings
// (a bold-only line), and blank-line-separated paragraphs. No external dep.

type Token = { text: string; bold?: boolean; code?: boolean };

// Split a line into bold/code/plain inline spans.
function parseInline(line: string): Token[] {
  const tokens: Token[] = [];
  const re = /(\*\*([^*]+)\*\*|`([^`]+)`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    if (m.index > last) tokens.push({ text: line.slice(last, m.index) });
    if (m[2] !== undefined) tokens.push({ text: m[2], bold: true });
    else if (m[3] !== undefined) tokens.push({ text: m[3], code: true });
    last = m.index + m[0].length;
  }
  if (last < line.length) tokens.push({ text: line.slice(last) });
  return tokens.length ? tokens : [{ text: line }];
}

function Inline({ tokens, color }: { tokens: Token[]; color: string }) {
  return (
    <Text style={[styles.body, { color }]}>
      {tokens.map((t, i) => (
        <Text
          key={i}
          style={
            t.bold ? styles.bold : t.code ? styles.code : undefined
          }>
          {t.text}
        </Text>
      ))}
    </Text>
  );
}

export function Markdown({ text, color = Brand.text }: { text: string; color?: string }) {
  const lines = text.replace(/\r/g, '').split('\n');
  const blocks: React.ReactNode[] = [];

  lines.forEach((raw, idx) => {
    const line = raw.trimEnd();
    if (!line.trim()) {
      blocks.push(<View key={`sp-${idx}`} style={{ height: 6 }} />);
      return;
    }

    const numbered = line.match(/^\s*(\d+)\.\s+(.*)$/);
    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    const heading = line.match(/^\*\*(.+)\*\*:?\s*$/); // a line that is only bold = heading

    if (heading) {
      blocks.push(
        <Text key={idx} style={[styles.heading, { color }]}>
          {heading[1]}
        </Text>
      );
    } else if (numbered) {
      blocks.push(
        <View key={idx} style={styles.row}>
          <Text style={[styles.marker, { color: Brand.accent }]}>{numbered[1]}.</Text>
          <View style={{ flex: 1 }}>
            <Inline tokens={parseInline(numbered[2])} color={color} />
          </View>
        </View>
      );
    } else if (bullet) {
      blocks.push(
        <View key={idx} style={styles.row}>
          <Text style={[styles.marker, { color: Brand.accent }]}>•</Text>
          <View style={{ flex: 1 }}>
            <Inline tokens={parseInline(bullet[1])} color={color} />
          </View>
        </View>
      );
    } else {
      blocks.push(
        <View key={idx} style={{ marginBottom: 2 }}>
          <Inline tokens={parseInline(line)} color={color} />
        </View>
      );
    }
  });

  return <View style={{ gap: 1 }}>{blocks}</View>;
}

const styles = StyleSheet.create({
  body: { fontFamily: FontFamily.regular, fontSize: 15, lineHeight: 22 },
  bold: { fontFamily: FontFamily.bold },
  code: { fontFamily: 'monospace', fontSize: 13.5 },
  heading: { fontFamily: FontFamily.semibold, fontSize: 14, lineHeight: 20, marginTop: 6, marginBottom: 3, letterSpacing: 0.2 },
  row: { flexDirection: 'row', gap: 8, marginBottom: 3, alignItems: 'flex-start' },
  marker: { fontFamily: FontFamily.semibold, fontSize: 15, lineHeight: 22, minWidth: 16 },
});
