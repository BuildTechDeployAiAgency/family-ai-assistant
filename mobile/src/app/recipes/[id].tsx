import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, SectionLabel } from '@/components/ui';
import { Brand } from '@/constants/theme';
import { useRecipes } from '@/store/recipes';

export default function RecipeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { getRecipe, deleteRecipe } = useRecipes();
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  const recipe = getRecipe(id);

  if (!recipe) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Recipe not found.</Text>
      </View>
    );
  }

  const remove = () => {
    Alert.alert('Delete recipe', `Remove "${recipe.title}" from the cookbook?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteRecipe(recipe.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <>
      <Stack.Screen options={{ title: recipe.title }} />
      <ScrollView
        style={styles.screen}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 16 }}>
        {!!recipe.image && <Image source={{ uri: recipe.image }} style={styles.hero} contentFit="cover" />}

        <View style={{ gap: 4 }}>
          <Text style={styles.title}>{recipe.title}</Text>
          {!!recipe.sourceUrl && <Text style={styles.source}>{recipe.sourceUrl}</Text>}
        </View>

        <View style={{ gap: 10 }}>
          <SectionLabel>Ingredients · {recipe.ingredients.length}</SectionLabel>
          <Card style={{ gap: 10 }}>
            {recipe.ingredients.map((ing, i) => (
              <Pressable key={i} style={styles.ingRow} onPress={() => setChecked((p) => ({ ...p, [i]: !p[i] }))}>
                <Ionicons
                  name={checked[i] ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={checked[i] ? Brand.green : Brand.muted}
                />
                <Text style={[styles.ingText, checked[i] && styles.ingDone]}>{ing}</Text>
              </Pressable>
            ))}
          </Card>
        </View>

        <View style={{ gap: 10 }}>
          <SectionLabel>Steps</SectionLabel>
          {recipe.steps.map((step, i) => (
            <Card key={i} style={styles.stepRow}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{i + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </Card>
          ))}
        </View>

        <Pressable onPress={remove} style={styles.deleteBtn}>
          <Ionicons name="trash-outline" size={16} color="#fb7185" />
          <Text style={styles.deleteText}>Delete recipe</Text>
        </Pressable>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Brand.bgBase },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Brand.bgBase },
  emptyText: { color: Brand.muted },
  hero: { width: '100%', height: 180, borderRadius: 16, backgroundColor: Brand.surface },
  title: { color: Brand.text, fontSize: 22, fontWeight: '800', lineHeight: 28 },
  source: { color: Brand.muted, fontSize: 12, fontStyle: 'italic' },
  ingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  ingText: { color: '#cbd5e1', fontSize: 14, lineHeight: 20, flex: 1 },
  ingDone: { textDecorationLine: 'line-through', color: Brand.muted },
  stepRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  stepNum: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(0,194,255,0.16)',
    alignItems: 'center', justifyContent: 'center',
  },
  stepNumText: { color: Brand.accent, fontWeight: '800', fontSize: 13 },
  stepText: { color: '#cbd5e1', fontSize: 14, lineHeight: 21, flex: 1 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12 },
  deleteText: { color: '#fb7185', fontWeight: '600' },
});
