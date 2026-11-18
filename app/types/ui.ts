export type UiVariant =
  | 'solid'
  | 'flat'
  | 'elevated'
  | 'outline'
  | 'outlined'
  | 'ghost'
  | 'text'
  | 'plain'
  | 'soft'
  | 'tonal'

export type UiSize =
  'xs' | 'x-small' | 'sm' | 'small' | 'md' | 'default' | 'lg' | 'large' | 'xl' | 'x-large'
export type UiColor =
  'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | (string & {})
export type UiRounded = 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'pill' | 'circle'
