export interface OttBrand {
  id: string;
  name: string;
  /** Data URL (~128×128) for custom brands; built-ins render a coloured letter tile. */
  logo?: string;
  color: string;
  screens: number;
  amount: number;
  builtIn: boolean;
  /** Built-ins can't be deleted, only hidden from the grid. */
  hidden?: boolean;
}
