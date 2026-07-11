import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Link, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, SectionLabel } from '@/components/ui';
import { Brand } from '@/constants/theme';
import { useRecipes } from '@/store/recipes';

export default function RecipesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { recipes } = useRecipes();

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 96, gap: 12 }}>
        <SectionLabel>Family cookbook · {recipes.length}</SectionLabel>

        {recipes.length === 0 && (
          <Card style={{ alignItems: 'center', gap: 8, paddingVertical: 28 }}>
            <Text style={{ fontSize: 40 }}>🍳</Text>
            <Text style={styles.emptyTitle}>No recipes yet</Text>
            <Text style={styles.emptySub}>
              Import one from anywhere — paste a link, some text, or snap a cookbook page.
            </Text>
          </Card>
        )}

        {recipes.map((r) => (
          <Link key={r.id} href={`/recipes/${r.id}`} asChild>
            <Pressable>
              {({ pressed }) => (
                <Card style={[styles.recipeCard, pressed && { opacity: 0.7 }]}>
                  {r.image ? (
                    <Image source={{ uri: r.image }} style={styles.thumb} contentFit="cover" />
                  ) : (
                    <View style={[styles.thumb, styles.thumbFallback]}>
                      <Text style={{ fontSize: 24 }}>🍽️</Text>
                    </View>
                  )}
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={styles.title} numberOfLines={2}>{r.title}</Text>
                    <Text style={styles.meta}>
                      {r.ingredients.length} ingredients · {r.steps.length} steps
                    </Text>
                    {!!r.sourceUrl && (
                      <Text style={styles.source} numberOfLines={1}>{r.sourceUrl}</Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Brand.muted} />
                </Card>
              )}
            </Pressable>
          </Link>
        ))}
      </ScrollView>
      <Pressable style={[styles.fab, { bottom: insets.bottom + 16 }]} onPress={() => router.push('/recipes/import')}>
        <Ionicons name="add" size={22} color="#04121f" />
        <Text style={styles.fabText}>Import</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.bgBase },
  screen: { flex: 1, backgroundColor: Brand.bgBase },
  emptyTitle: { color: Brand.text, fontSize: 16, fontWeight: '700' },
  emptySub: { color: Brand.muted, fontSize: 13, textAlign: 'center', lineHeight: 19, paddingHorizontal: 16 },
  recipeCard: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  thumb: { width: 56, height: 56, borderRadius: 12, backgroundColor: Brand.surfaceAlt },
  thumbFallback: { alignItems: 'center', justifyContent: 'center' },
  title: { color: Brand.text, fontSize: 15, fontWeight: '700', lineHeight: 20 },
  meta: { color: Brand.muted, fontSize: 12 },
  source: { color: Brand.muted, fontSize: 11, fontStyle: 'italic' },
  fab: {
    position: 'absolute', right: 16, flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Brand.accent, paddingHorizontal: 18, paddingVertical: 14, borderRadius: 999,
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  fabText: { color: '#04121f', fontWeight: '800', fontSize: 15 },
});
