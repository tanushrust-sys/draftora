// Age-specific prompt index — imports per-age-group prompt files.
// The 5-7 bank is intentionally deeper, while older groups keep their
// standard per-category counts.

import {
  PROMPTS_11_13,
  PROMPTS_14_17,
  PROMPTS_18_21,
  PROMPTS_22PLUS,
  PROMPTS_5_7,
  PROMPTS_8_10,
} from './prompts-age-generated';

export const PROMPTS_BY_AGE: Record<string, Record<string, string[]>> = {
  '5-7':   PROMPTS_5_7,
  '8-10':  PROMPTS_8_10,
  '11-13': PROMPTS_11_13,
  '14-17': PROMPTS_14_17,
  '18-21': PROMPTS_18_21,
  '22+':   PROMPTS_22PLUS,
};
