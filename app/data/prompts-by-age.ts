// Age-specific prompt index — imports per-age-group prompt files
// Each age group has 300 prompts per writing category.

import { PROMPTS_5_7 }    from './prompts-age-5-7';
import { PROMPTS_8_10 }   from './prompts-age-8-10';
import { PROMPTS_11_13 }  from './prompts-age-11-13';
import { PROMPTS_14_17 }  from './prompts-age-14-17';
import { PROMPTS_18_21 }  from './prompts-age-18-21';
import { PROMPTS_22PLUS } from './prompts-age-22plus';

export const PROMPTS_BY_AGE: Record<string, Record<string, string[]>> = {
  '5-7':   PROMPTS_5_7,
  '8-10':  PROMPTS_8_10,
  '11-13': PROMPTS_11_13,
  '14-17': PROMPTS_14_17,
  '18-21': PROMPTS_18_21,
  '22+':   PROMPTS_22PLUS,
};
