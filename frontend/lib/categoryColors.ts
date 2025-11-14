/**
 * Category color utilities
 * Loads colors from categories.json instead of hardcoding
 */

import categoriesData from '@/public/categories.json';

interface CategoryNode {
  id: string;
  name: string;
  description: string;
  color: string;
  icon?: string;
  children?: CategoryNode[];
}

interface CategoriesData {
  categories: CategoryNode[];
}

export interface CategoryInfo {
  id: string;
  name: string;
  color: string;
}

/**
 * Build maps for category lookups
 */
const buildCategoryMaps = (): {
  colorMap: Record<string, string>;
  nameMap: Record<string, string>;
  parentMap: Record<string, string>; // child ID -> parent ID
} => {
  const colorMap: Record<string, string> = {};
  const nameMap: Record<string, string> = {};
  const parentMap: Record<string, string> = {};

  const traverse = (node: CategoryNode, parent?: CategoryNode) => {
    colorMap[node.id] = node.color;
    nameMap[node.id] = node.name;

    if (parent) {
      parentMap[node.id] = parent.id;
    }

    if (node.children) {
      node.children.forEach(child => traverse(child, node));
    }
  };

  (categoriesData as CategoriesData).categories.forEach(node => traverse(node));

  return { colorMap, nameMap, parentMap };
};

const { colorMap: CATEGORY_COLOR_MAP, nameMap: CATEGORY_NAME_MAP, parentMap: CATEGORY_PARENT_MAP } = buildCategoryMaps();

/**
 * Get the full hierarchy for a category (from root to leaf)
 * Returns array of CategoryInfo in order: [root, ..., leaf]
 *
 * Supports both formats:
 * - Dot-separated paths: "technology.printing.mechanical_press"
 * - Direct IDs: "mechanical_press"
 */
export const getCategoryHierarchy = (categoryId: string | undefined): CategoryInfo[] => {
  if (!categoryId) return [];

  // If category contains dots, it's a path - split and look up each segment
  if (categoryId.includes('.')) {
    const segments = categoryId.split('.');
    const hierarchy: CategoryInfo[] = [];

    for (const segment of segments) {
      if (CATEGORY_NAME_MAP[segment]) {
        hierarchy.push({
          id: segment,
          name: CATEGORY_NAME_MAP[segment],
          color: CATEGORY_COLOR_MAP[segment] || '#3b82f6'
        });
      }
    }

    return hierarchy;
  }

  // Otherwise, use parent relationship traversal
  const hierarchy: CategoryInfo[] = [];
  let currentId: string | undefined = categoryId;

  // Build hierarchy from leaf to root
  const visited = new Set<string>();
  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);

    hierarchy.unshift({
      id: currentId,
      name: CATEGORY_NAME_MAP[currentId] || currentId,
      color: CATEGORY_COLOR_MAP[currentId] || '#3b82f6'
    });

    currentId = CATEGORY_PARENT_MAP[currentId];
  }

  return hierarchy;
};

/**
 * Get category color from category ID
 * For dot-separated paths, returns the color of the last (most specific) segment
 */
export const getCategoryColor = (category: string | undefined): string => {
  if (!category) return '#3b82f6'; // default blue

  // If category contains dots, get the last segment (finest-grained)
  if (category.includes('.')) {
    const segments = category.split('.');
    const lastSegment = segments[segments.length - 1];
    return CATEGORY_COLOR_MAP[lastSegment] || '#3b82f6';
  }

  return CATEGORY_COLOR_MAP[category] || '#3b82f6';
};

/**
 * Get background and text colors for a category
 * Used for badges and UI elements
 */
export const getCategoryColors = (category: string | undefined): { bg: string; text: string } => {
  const bg = getCategoryColor(category);

  // For very dark colors, use light text; otherwise use dark text
  // This is a simple heuristic - could be improved with proper color contrast calculation
  const isDark = bg.startsWith('#0') || bg.startsWith('#1') || bg.startsWith('#2') ||
                 bg.startsWith('#3') || bg.startsWith('#4') || bg.startsWith('#5') ||
                 bg.startsWith('#6') || bg.startsWith('#7');

  const text = isDark ? '#f3f4f6' : '#1f2937';

  return { bg, text };
};

/**
 * Check if a category matches a filter category
 * Returns true if:
 * 1. categoryId exactly matches filterCategoryId, OR
 * 2. categoryId is a descendant of filterCategoryId (has it as a parent/ancestor)
 */
export const categoryMatchesFilter = (categoryId: string | undefined, filterCategoryId: string): boolean => {
  if (!categoryId) return false;
  if (categoryId === filterCategoryId) return true;

  // Walk up the parent chain to see if we find the filter category
  let currentId: string | undefined = categoryId;
  const visited = new Set<string>();

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    currentId = CATEGORY_PARENT_MAP[currentId];

    if (currentId === filterCategoryId) {
      return true;
    }
  }

  return false;
};
