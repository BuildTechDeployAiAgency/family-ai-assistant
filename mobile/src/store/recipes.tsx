import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { api } from '@/lib/api';
import { useAuth } from '@/store/auth';

export interface Recipe {
  id: string;
  title: string;
  sourceUrl: string;
  image: string;
  ingredients: string[];
  steps: string[];
}

interface RecipesContextValue {
  recipes: Recipe[];
  loading: boolean;
  addRecipe: (recipe: Omit<Recipe, 'id'>) => Promise<Recipe>;
  getRecipe: (id: string) => Recipe | undefined;
  deleteRecipe: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const RecipesContext = createContext<RecipesContextValue | null>(null);

const nextId = () => `recipe-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

export function RecipesProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setRecipes(await api.get<Recipe[]>('/api/recipes'));
    } catch (err) {
      console.error('Failed to load recipes:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) {
      refresh();
    } else {
      setRecipes([]);
    }
  }, [session, refresh]);

  const addRecipe = useCallback(async (recipe: Omit<Recipe, 'id'>) => {
    const payload: Recipe = { ...recipe, id: nextId() };
    setRecipes((prev) => [payload, ...prev]);
    try {
      const created = await api.post<Recipe>('/api/recipes', payload);
      setRecipes((prev) => prev.map((r) => (r.id === payload.id ? created : r)));
      return created;
    } catch (err) {
      console.error('Failed to save recipe:', err);
      return payload;
    }
  }, []);

  const getRecipe = useCallback((id: string) => recipes.find((r) => r.id === id), [recipes]);

  const deleteRecipe = useCallback(async (id: string) => {
    setRecipes((prev) => prev.filter((r) => r.id !== id));
    await api.del(`/api/recipes/${id}`);
  }, []);

  const value = useMemo(
    () => ({ recipes, loading, addRecipe, getRecipe, deleteRecipe, refresh }),
    [recipes, loading, addRecipe, getRecipe, deleteRecipe, refresh]
  );

  return <RecipesContext.Provider value={value}>{children}</RecipesContext.Provider>;
}

export function useRecipes() {
  const ctx = useContext(RecipesContext);
  if (!ctx) throw new Error('useRecipes must be used within RecipesProvider');
  return ctx;
}
