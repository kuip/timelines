import { useMemo } from 'react';

export interface Category {
  id: string;
  name: string;
  description: string;
  color: string;
  icon?: string;
  parentId?: string;
}

export interface CategoryGroup {
  id: string;
  name: string;
  description: string;
  color: string;
  icon?: string;
  children: Category[];
}

export const useCategories = () => {
  const flatCategories = useMemo(() => {
    const categoriesData = require('@/config/categories.json').categories;
    const flat: Category[] = [];

    categoriesData.forEach((group: any) => {
      if (group.children) {
        group.children.forEach((child: any) => {
          flat.push({
            id: child.id,
            name: child.name,
            description: child.description,
            color: child.color,
            icon: group.icon,
            parentId: group.id,
          });
        });
      }
    });

    return flat;
  }, []);

  const groupedCategories = useMemo(() => {
    const categoriesData = require('@/config/categories.json').categories;
    return categoriesData as CategoryGroup[];
  }, []);

  const getCategoryById = (id: string): Category | CategoryGroup | undefined => {
    const flat = flatCategories.find((c) => c.id === id);
    if (flat) return flat;
    return groupedCategories.find((g) => g.id === id);
  };

  const getCategoryColor = (id: string): string => {
    const category = getCategoryById(id);
    return category?.color || '#6b7280';
  };

  const getCategoryIcon = (id: string): string => {
    const category = getCategoryById(id);
    return category?.icon || '📌';
  };

  return {
    flatCategories,
    groupedCategories,
    getCategoryById,
    getCategoryColor,
    getCategoryIcon,
  };
};
