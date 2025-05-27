
'use server';
/**
 * @fileOverview A Genkit flow to suggest dish quantities for the kitchen.
 *
 * - suggestDishQuantities - A function that suggests dish quantities based on meal preferences.
 * - SuggestDishQuantitiesInput - The input type for the suggestDishQuantities function.
 * - SuggestDishQuantitiesOutput - The return type for the suggestDishQuantities function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { allAvailableDishNames } from '@/lib/menu-data'; // Import the master list of dish names

const DishSuggestionSchema = z.object({
  dishName: z.string().describe('The name of the dish to prepare. This MUST be one of the provided available dish names.'),
  quantity: z.string().describe('The suggested quantity or number of portions (e.g., "Approx. 15 portions", "Standard + 10%", "N/A if count is 0").'),
  note: z.string().describe('Additional notes or reasons for the suggestion, incorporating historical data or event factors if provided. If a category has 0 attendees, note why a dish might not be suggested.'),
});

const SuggestDishQuantitiesInputSchema = z.object({
  totalCheckIns: z.number().describe('Total number of employee check-ins for the day.'),
  vegCount: z.number().describe('Number of vegetarian preferences.'),
  nonVegCount: z.number().describe('Number of non-vegetarian preferences.'),
  veganCount: z.number().describe('Number of vegan preferences.'),
  historicalWastePercentage: z.number().optional().describe('Optional. Average historical waste percentage for similar meals (e.g., 0.1 for 10%). Helps in adjusting quantities to minimize waste.'),
  specialEventMultiplier: z.number().optional().describe('Optional. A multiplier for special events (e.g., 1.2 for a 20% increase in quantity). Default is 1.0 (no event).'),
  dayOfWeekFactor: z.string().optional().describe('Optional. A textual hint about typical demand for the current day of the week (e.g., "Friday - expect higher non-veg demand").'),
});
export type SuggestDishQuantitiesInput = z.infer<typeof SuggestDishQuantitiesInputSchema>;

const SuggestDishQuantitiesOutputSchema = z.object({
  suggestions: z.array(DishSuggestionSchema).describe('An array of dish preparation suggestions.'),
});
export type SuggestDishQuantitiesOutput = z.infer<typeof SuggestDishQuantitiesOutputSchema>;


export async function suggestDishQuantities(input: SuggestDishQuantitiesInput): Promise<SuggestDishQuantitiesOutput> {
  return suggestDishQuantitiesFlow(input);
}

// Internal schema for the prompt, including pre-processed fields and available dishes
const PromptInputSchema = SuggestDishQuantitiesInputSchema.extend({
  processedHistoricalWaste: z.string().optional(),
  exampleVegPortions: z.string(),
  exampleNonVegPortions: z.string(),
  exampleVeganPortions: z.string(),
  exampleStapleBuffer: z.string(),
  effectiveSpecialEventMultiplier: z.number(),
  availableDishNames: z.array(z.string()).describe('A list of all dish names that the kitchen can prepare. You MUST choose from this list for your suggestions.')
});
type PromptInput = z.infer<typeof PromptInputSchema>;


const prompt = ai.definePrompt({
  name: 'suggestDishQuantitiesPrompt',
  input: {schema: PromptInputSchema}, // Use the extended schema for the prompt
  output: {schema: SuggestDishQuantitiesOutputSchema},
  prompt: `You are a kitchen planning assistant for a corporate cafeteria.
Based on the following daily meal check-in data, contextual factors, and the list of available dishes, provide 3-5 dish preparation suggestions.
Your suggestions for 'dishName' MUST be chosen from the 'Available Dishes' list provided below.
Consider a balanced menu and try to minimize potential waste by referring to historical data if available.
Adjust quantities for special events if indicated. Use day-of-week insights for demand planning.

Today's Check-in Data:
- Total Employees Checked-in: {{{totalCheckIns}}}
- Vegetarian Preferences: {{{vegCount}}}
- Non-Vegetarian Preferences: {{{nonVegCount}}}
- Vegan Preferences: {{{veganCount}}}

Contextual Factors:
{{#if historicalWastePercentage}}- Historical Waste Percentage: Approximately {{{processedHistoricalWaste}}}. Aim to reduce this.{{/if}}
{{#if specialEventMultiplier}}- Special Event Multiplier: {{specialEventMultiplier}} (1.0 is normal). Adjust main dish quantities accordingly.{{/if}}
{{#if dayOfWeekFactor}}- Day of Week Insight: {{{dayOfWeekFactor}}}{{/if}}

Available Dishes (You MUST select dish names from this list for your suggestions):
{{#each availableDishNames}}
- {{{this}}}
{{/each}}

Quantity Calculation Guide:
Your primary goal is to suggest appropriate quantities based DIRECTLY on the counts for each dietary preference.
- Vegetarian Main Dishes:
  - If 'vegCount' is 0, do NOT suggest a vegetarian main dish from the available list, or clearly state quantity as "0 portions" or "N/A".
  - If 'vegCount' is > 0, suggest a quantity for a vegetarian dish (from the available list) to comfortably serve 'vegCount' employees. For very small counts (e.g., 1-5), aim for that exact number or a tiny buffer (e.g., +1 portion). For larger counts, a small buffer (e.g., 5-10%) is acceptable.
- Non-Vegetarian Main Dishes:
  - If 'nonVegCount' is 0, do NOT suggest a non-vegetarian main dish from the available list, or state quantity as "0 portions" or "N/A".
  - If 'nonVegCount' is > 0, suggest a quantity for a non-vegetarian dish (from the available list) to comfortably serve 'nonVegCount' employees. Apply similar buffering logic as for vegetarian dishes.
- Vegan Dishes:
  - If 'veganCount' is 0, do NOT suggest a specific vegan main dish from the available list unless it's a general side that happens to be vegan. If you suggest one, clearly state quantity as "0 portions" or "N/A".
  - If 'veganCount' is > 0, suggest a quantity for a vegan dish (from the available list) to comfortably serve 'veganCount' employees. Apply similar buffering logic.
- Staples (e.g., Rice, Roti from the available list):
  - Base this on 'totalCheckIns'. Provide a reasonable buffer.
- Adjustments:
  - If 'effectiveSpecialEventMultiplier' is > 1.0, proportionally increase the calculated quantities for popular main dishes by this multiplier.
  - If 'historicalWastePercentage' is high (e.g., > 10% as indicated by 'processedHistoricalWaste'), be slightly more conservative with buffers for relevant dish types.
- The 'quantity' string in your output should be descriptive, like "Approx. X portions", "Serves Y-Z people", "Standard + N% buffer", or "N/A (0 preference)".

General Dish Selection:
- Suggest 3-5 dishes in total, selected EXCLUSIVELY from the 'Available Dishes' list.
- Include appropriate main courses (from the list) and at least one staple (from the list).
- Only suggest main courses (from the list) for dietary preferences where the count is greater than 0. For instance, if 'nonVegCount' is 0, do not suggest any non-vegetarian main course. If 'vegCount' is 10 and 'nonVegCount' is 0, focus your main course suggestions on vegetarian options from the available list.
- Focus on common Indian corporate lunch items available in the provided list.

The quantities shown in the 'Example output format' below (like "{{{exampleVegPortions}}}") are dynamically calculated based on the input *solely to illustrate the desired format and type of reasoning*. **Your role is to pick appropriate dishes from the 'Available Dishes' list for the GIVEN INPUTS and then calculate NEW quantities for THOSE DISHES based on the 'Quantity Calculation Guide' above. Do NOT directly copy or be numerically influenced by the example quantities in the illustrative format below.**

Example output format (Illustrative only. Calculate fresh based on inputs, guide, and ensure dishName is from the Available Dishes list):
{
  "suggestions": [
    { "dishName": "Paneer Butter Masala", "quantity": "{{{exampleVegPortions}}}", "note": "High demand based on veg count. Chosen from available dishes. {{#if historicalWastePercentage}}Consider past waste of {{{processedHistoricalWaste}}}.{{/if}} {{#if dayOfWeekFactor}}Factor in: {{{dayOfWeekFactor}}}{{/if}}" },
    { "dishName": "Chicken Biryani", "quantity": "{{{exampleNonVegPortions}}}", "note": "Popular non-veg choice from available list. {{#if dayOfWeekFactor}}Factor in: {{{dayOfWeekFactor}}}{{/if}}" },
    { "dishName": "Vegan Dal Makhani", "quantity": "{{{exampleVeganPortions}}}", "note": "Ensure vegan option is available from the list. If veganCount is 0, note this." },
    { "dishName": "Steamed Rice", "quantity": "{{{exampleStapleBuffer}}}", "note": "General buffer, serves all. Selected from available staples. Adjust slightly if overall historical waste is high." }
  ]
}
Output MUST be in the format specified by the output schema, and all dishName values MUST be from the provided 'Available Dishes' list.
`,
});

const suggestDishQuantitiesFlow = ai.defineFlow(
  {
    name: 'suggestDishQuantitiesFlow',
    inputSchema: SuggestDishQuantitiesInputSchema,  // External contract uses original schema
    outputSchema: SuggestDishQuantitiesOutputSchema,
  },
  async (input: SuggestDishQuantitiesInput): Promise<SuggestDishQuantitiesOutput> => {
    const effectiveSpecialEventMultiplier = input.specialEventMultiplier || 1.0;
    
    let processedHistoricalWaste: string | undefined = undefined;
    if (input.historicalWastePercentage !== undefined) {
        processedHistoricalWaste = `${(input.historicalWastePercentage * 100).toFixed(0)}%`;
    }

    // These example quantities are for ILLUSTRATING the prompt format.
    // The AI's actual quantity suggestions should be based on its own dish choices and the new guide.
    const calculateExamplePortion = (count: number, multiplier: number) => {
        if (count === 0) return "N/A (0 preference)";
        let baseQuantity = 0;
        if (count > 0 && count <=5) baseQuantity = count + 1; // small buffer for small counts
        else if (count > 5) baseQuantity = Math.ceil(count * 1.1); // 10% buffer for larger counts
        else baseQuantity = count; // handles count = 0 if not caught above, or negative (though schema prevents)
        
        baseQuantity = Math.max(1, baseQuantity); // Ensure at least 1 if count > 0
        const adjustedQuantity = Math.round(baseQuantity * multiplier);
        return `Approx. ${adjustedQuantity} portion${adjustedQuantity !== 1 ? 's' : ''}`;
    };

    const exampleVegPortions = calculateExamplePortion(input.vegCount, effectiveSpecialEventMultiplier);
    const exampleNonVegPortions = calculateExamplePortion(input.nonVegCount, effectiveSpecialEventMultiplier);
    const exampleVeganPortions = calculateExamplePortion(input.veganCount, effectiveSpecialEventMultiplier);
    // Example for staple, assuming totalCheckIns gives a base
    const exampleStapleBase = Math.max(1, Math.ceil(input.totalCheckIns * 0.8 * effectiveSpecialEventMultiplier)); // 80% coverage, with event multiplier
    const exampleStapleBuffer = `Approx. ${exampleStapleBase} portions (e.g. ${Math.round(Math.max(5, (effectiveSpecialEventMultiplier-1)*100))}% buffer)`;


    const promptDataForFlow: PromptInput = {
        ...input,
        processedHistoricalWaste,
        exampleVegPortions,
        exampleNonVegPortions,
        exampleVeganPortions,
        exampleStapleBuffer,
        effectiveSpecialEventMultiplier,
        availableDishNames: allAvailableDishNames, // Pass the master list of dish names
    };
    
    const {output} = await prompt(promptDataForFlow);
    if (!output || !output.suggestions || output.suggestions.length === 0) {
        // Handle cases where the prompt might not return the expected output or returns null/undefined
        return { suggestions: [
            { dishName: "Suggestion Error", quantity: "N/A", note: "Could not generate suggestions at this time. Input counts might be too low or model is recalibrating. Ensure 'Available Dishes' list was provided."}
        ]};
    }
    // Validate that suggested dishes are from the available list (optional client-side check, AI should follow prompt)
    const validSuggestions = output.suggestions.filter(suggestion => 
        allAvailableDishNames.includes(suggestion.dishName)
    );

    if (validSuggestions.length !== output.suggestions.length) {
        console.warn("AI suggested dishes not in the available list. Filtering them out.");
         return { suggestions: [
            { dishName: "Suggestion Adherence Error", quantity: "N/A", note: "AI failed to adhere to the available dish list. Please retry or check prompt."}
        ]};
    }

    return { suggestions: validSuggestions };
  }
);
