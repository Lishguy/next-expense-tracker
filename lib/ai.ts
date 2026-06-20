import OpenAI from 'openai';

interface RawInsight {
  type?: string;
  title?: string;
  message?: string;
  action?: string;
  confidence?: number;
}

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    'X-Title': 'ExpenseTracker AI',
  },
});

export interface ExpenseRecord {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
}

export interface AIInsight {
  id: string;
  type: 'warning' | 'info' | 'success' | 'tip';
  title: string;
  message: string;
  action?: string;
  confidence: number;
}

function buildHeuristicInsights(expenses: ExpenseRecord[]): AIInsight[] {
  if (expenses.length === 0) {
    return [
      {
        id: 'heuristic-empty-1',
        type: 'info',
        title: 'Start Tracking to Unlock Insights',
        message:
          'Add a few expenses and I will highlight your biggest spending categories, alerts, and saving opportunities.',
        action: 'Add your first expense',
        confidence: 1,
      },
    ];
  }

  const categoryTotals = expenses.reduce(
    (acc, expense) => {
      const category = expense.category || 'Other';
      if (!acc[category]) {
        acc[category] = { total: 0, count: 0 };
      }

      acc[category].total += expense.amount;
      acc[category].count += 1;
      return acc;
    },
    {} as Record<string, { total: number; count: number }>
  );

  const totalSpend = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const topCategories = Object.entries(categoryTotals)
    .map(([category, data]) => ({ category, ...data }))
    .sort((a, b) => b.total - a.total);

  const insights: AIInsight[] = [];
  const topCategory = topCategories[0];

  if (topCategory && totalSpend > 0) {
    const share = topCategory.total / totalSpend;
    insights.push({
      id: 'heuristic-top-category',
      type: share >= 0.35 ? 'warning' : 'info',
      title: `Top Spending Area: ${topCategory.category}`,
      message: `${topCategory.category} is your largest category at $${topCategory.total.toFixed(
        2
      )}, which is ${Math.round(share * 100)}% of your recent spending.`,
      action: `Review ${topCategory.category.toLowerCase()} expenses`,
      confidence: 0.9,
    });
  }

  const transportation = categoryTotals.Transportation;
  if (transportation && transportation.total > Math.max(25, totalSpend * 0.2)) {
    insights.push({
      id: 'heuristic-transportation',
      type: 'warning',
      title: 'Transportation Cost Alert',
      message: `Transportation spending is $${transportation.total.toFixed(
        2
      )} across ${transportation.count} expenses. That is high enough to review fuel, rideshare, parking, or transit costs.`,
      action: 'Check fuel, rideshare, and parking costs',
      confidence: 0.92,
    });
  }

  const shopping = categoryTotals.Shopping;
  if (shopping && shopping.total > Math.max(25, totalSpend * 0.2)) {
    insights.push({
      id: 'heuristic-shopping',
      type: 'warning',
      title: 'Shopping Spree Alert',
      message: `Shopping spending reached $${shopping.total.toFixed(
        2
      )} across ${shopping.count} purchases. That pattern often means impulse buying or repeated small purchases.`,
      action: 'Pause nonessential purchases for a few days',
      confidence: 0.91,
    });
  }

  const food = categoryTotals.Food;
  if (food && food.total > Math.max(20, totalSpend * 0.15)) {
    insights.push({
      id: 'heuristic-food',
      type: 'tip',
      title: 'Food and Dining Check-in',
      message: `Food spending is $${food.total.toFixed(
        2
      )} across ${food.count} transactions. Small coffee and takeout purchases can add up quickly.`,
      action: 'Set a weekly food budget',
      confidence: 0.88,
    });
  }

  if (topCategories.length >= 2) {
    const secondCategory = topCategories[1];
    insights.push({
      id: 'heuristic-second-category',
      type: 'info',
      title: `Second Highest Category: ${secondCategory.category}`,
      message: `${secondCategory.category} is your second biggest category at $${secondCategory.total.toFixed(
        2
      )}. Comparing it with your top category can reveal where to cut back fastest.`,
      action: `Compare ${secondCategory.category.toLowerCase()} spending`,
      confidence: 0.84,
    });
  }

  if (insights.length < 3) {
    insights.push({
      id: 'heuristic-balance',
      type: 'success',
      title: 'Spending Looks Balanced',
      message:
        'Your expenses are spread across categories without one extreme spike. Keep tracking to spot trends earlier.',
      action: 'Continue logging expenses',
      confidence: 0.8,
    });
  }

  return insights.slice(0, 4);
}

export async function generateExpenseInsights(
  expenses: ExpenseRecord[]
): Promise<AIInsight[]> {
  try {
    // Prepare expense data for AI analysis
    const expensesSummary = expenses.map((expense) => ({
      amount: expense.amount,
      category: expense.category,
      description: expense.description,
      date: expense.date,
    }));

    const prompt = `Analyze the following expense data and provide 3-4 actionable financial insights. 
    Return a JSON array of insights with this structure:
    {
      "type": "warning|info|success|tip",
      "title": "Brief title",
      "message": "Detailed insight message with specific numbers when possible",
      "action": "Actionable suggestion",
      "confidence": 0.8
    }

    Expense Data:
    ${JSON.stringify(expensesSummary, null, 2)}

    Focus on:
    1. Spending patterns (day of week, categories)
    2. Budget alerts (high spending areas)
    3. Money-saving opportunities
    4. Positive reinforcement for good habits

    Return only valid JSON array, no additional text.`;

    const completion = await openai.chat.completions.create({
      model: 'deepseek/deepseek-chat-v3-0324:free',
      messages: [
        {
          role: 'system',
          content:
            'You are a financial advisor AI that analyzes spending patterns and provides actionable insights. Always respond with valid JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const response = completion.choices[0].message.content;
    if (!response) {
      throw new Error('No response from AI');
    }

    // Clean the response by removing markdown code blocks if present
    let cleanedResponse = response.trim();
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse
        .replace(/^```json\s*/, '')
        .replace(/\s*```$/, '');
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse
        .replace(/^```\s*/, '')
        .replace(/\s*```$/, '');
    }

    // Parse AI response
    const insights = JSON.parse(cleanedResponse);

    if (!Array.isArray(insights) || insights.length === 0) {
      throw new Error('AI returned an empty or invalid insight array');
    }

    // Add IDs and ensure proper format
    const formattedInsights = insights.map(
      (insight: RawInsight, index: number) => ({
        id: `ai-${Date.now()}-${index}`,
        type: ['warning', 'info', 'success', 'tip'].includes(
          insight.type || ''
        )
          ? (insight.type as AIInsight['type'])
          : 'info',
        title: insight.title || 'AI Insight',
        message: insight.message || 'Analysis complete',
        action: insight.action,
        confidence: insight.confidence || 0.8,
      })
    );

    return formattedInsights;
  } catch (error) {
    console.error('❌ Error generating AI insights:', error);

    // Fallback to deterministic insights so the tab still stays useful.
    return buildHeuristicInsights(expenses);
  }
}

export async function categorizeExpense(description: string): Promise<string> {
  try {
    const validCategories = [
      'Food',
      'Transportation',
      'Entertainment',
      'Shopping',
      'Bills',
      'Healthcare',
      'Other',
    ];

    const normalizedDescription = description.toLowerCase().trim();

    const keywordRules: Array<{ category: string; keywords: string[] }> = [
      {
        category: 'Transportation',
        keywords: [
          'gas',
          'fuel',
          'petrol',
          'diesel',
          'uber',
          'lyft',
          'taxi',
          'bus',
          'train',
          'metro',
          'subway',
          'transit',
          'parking',
          'toll',
          'fare',
        ],
      },
      {
        category: 'Food',
        keywords: [
          'coffee',
          'cafe',
          'restaurant',
          'lunch',
          'dinner',
          'breakfast',
          'groceries',
          'grocery',
          'meal',
          'food',
          'snack',
          'pizza',
          'burger',
          'takeout',
          'delivery',
          'dining',
        ],
      },
      {
        category: 'Bills',
        keywords: [
          'rent',
          'electric',
          'water',
          'internet',
          'phone',
          'utility',
          'utilities',
          'bill',
          'subscription',
          'netflix',
          'spotify',
        ],
      },
      {
        category: 'Healthcare',
        keywords: [
          'doctor',
          'medicine',
          'pharmacy',
          'prescription',
          'hospital',
          'clinic',
          'dental',
          'dentist',
          'health',
          'medical',
        ],
      },
      {
        category: 'Entertainment',
        keywords: [
          'movie',
          'cinema',
          'concert',
          'game',
          'games',
          'streaming',
          'netflix',
          'youtube',
          'music',
          'theater',
        ],
      },
      {
        category: 'Shopping',
        keywords: ['amazon', 'store', 'clothes', 'clothing', 'shoes', 'mall', 'shopping'],
      },
    ];

    for (const rule of keywordRules) {
      if (rule.keywords.some((keyword) => normalizedDescription.includes(keyword))) {
        return rule.category;
      }
    }

    const completion = await openai.chat.completions.create({
      model: 'deepseek/deepseek-chat-v3-0324:free',
      messages: [
        {
          role: 'system',
          content:
            'You are an expense categorization AI. Categorize expenses into exactly one of these categories: Food, Transportation, Entertainment, Shopping, Bills, Healthcare, Other. Use Transportation for fuel, gas, rideshare, transit, parking, and tolls. Use Food for coffee, restaurants, groceries, dining, and meals. Prefer the most specific category. Respond with only the category name.',
        },
        {
          role: 'user',
          content: `Categorize this expense description into one category: "${description}"`,
        },
      ],
      temperature: 0,
      max_tokens: 20,
    });

    const category = completion.choices[0].message.content?.trim();

    return validCategories.includes(category || '') ? category! : 'Other';
  } catch (error) {
    console.error('❌ Error categorizing expense:', error);
    return 'Other';
  }
}

export async function generateAIAnswer(
  question: string,
  context: ExpenseRecord[]
): Promise<string> {
  try {
    const expensesSummary = context.map((expense) => ({
      amount: expense.amount,
      category: expense.category,
      description: expense.description,
      date: expense.date,
    }));

    const prompt = `Based on the following expense data, provide a detailed and actionable answer to this question: "${question}"

    Expense Data:
    ${JSON.stringify(expensesSummary, null, 2)}

    Provide a comprehensive answer that:
    1. Addresses the specific question directly
    2. Uses concrete data from the expenses when possible
    3. Offers actionable advice
    4. Keeps the response concise but informative (2-3 sentences)
    
    Return only the answer text, no additional formatting.`;

    const completion = await openai.chat.completions.create({
      model: 'deepseek/deepseek-chat-v3-0324:free',
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful financial advisor AI that provides specific, actionable answers based on expense data. Be concise but thorough.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 200,
    });

    const response = completion.choices[0].message.content;
    if (!response) {
      throw new Error('No response from AI');
    }

    return response.trim();
  } catch (error) {
    console.error('❌ Error generating AI answer:', error);
    return "I'm unable to provide a detailed answer at the moment. Please try refreshing the insights or check your connection.";
  }
}