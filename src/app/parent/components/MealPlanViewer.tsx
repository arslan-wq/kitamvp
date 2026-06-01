'use client';

import { useEffect, useState } from 'react';
import { Allergy } from '@prisma/client';

interface Meal {
  day: string;
  breakfast: string;
  lunch: string;
  snack: string;
  notes?: string;
}

interface AllergenInfo {
  allergen: string;
  details: string;
}

interface MealPlanViewerProps {
  childAllergies: Allergy[];
}

export default function MealPlanViewer({ childAllergies }: MealPlanViewerProps) {
  const [mealPlan, setMealPlan] = useState<any>(null);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [allergenInfo, setAllergenInfo] = useState<AllergenInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMealPlan = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/meal-plans');
        if (!response.ok) throw new Error('Failed to fetch meal plan');

        const data = await response.json();
        if (data.length > 0) {
          const currentMealPlan = data[0]; // Get most recent meal plan
          setMealPlan(currentMealPlan);

          try {
            const parsedMeals = JSON.parse(currentMealPlan.meals);
            setMeals(parsedMeals);
          } catch {
            setMeals([]);
          }

          try {
            if (currentMealPlan.allergenInfo) {
              const parsedAllergens = JSON.parse(currentMealPlan.allergenInfo);
              setAllergenInfo(parsedAllergens);
            }
          } catch {
            setAllergenInfo([]);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Fehler beim Laden des Speiseplans');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMealPlan();
  }, []);

  const hasChildAllergy = (allergenName: string) => {
    return childAllergies.some(
      allergy => allergy.allergen.toLowerCase() === allergenName.toLowerCase()
    );
  };

  const highlightAllergens = (text: string): JSX.Element[] => {
    const parts: JSX.Element[] = [];
    let lastIndex = 0;

    allergenInfo.forEach((allergen, index) => {
      const regex = new RegExp(`\\b${allergen.allergen}\\b`, 'gi');
      let match;

      while ((match = regex.exec(text)) !== null) {
        // Add text before match
        if (match.index > lastIndex) {
          parts.push(<span key={`text-${index}-${lastIndex}`}>{text.slice(lastIndex, match.index)}</span>);
        }

        // Add highlighted allergen
        const isRelevant = hasChildAllergy(allergen.allergen);
        parts.push(
          <span
            key={`allergen-${index}-${match.index}`}
            className={`font-semibold px-1 rounded ${
              isRelevant
                ? 'bg-red-200 text-red-900 border border-red-400'
                : 'bg-yellow-100 text-yellow-900'
            }`}
            title={allergen.details}
          >
            {match[0]}
          </span>
        );

        lastIndex = regex.lastIndex;
      }
    });

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(<span key={`text-end`}>{text.slice(lastIndex)}</span>);
    }

    return parts.length > 0 ? parts : [<span key="original">{text}</span>];
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl shadow-soft p-8">
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse bg-gray-200 h-24 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <h3 className="text-lg font-bold text-red-900 mb-2">Fehler beim Laden</h3>
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  if (!mealPlan || meals.length === 0) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="text-lg font-bold text-blue-900 mb-2">📋 Noch kein Speiseplan</h3>
        <p className="text-blue-700">
          Der Speiseplan für die kommende Woche wird in Kürze hochgeladen.
        </p>
      </div>
    );
  }

  const weekStartDate = new Date(mealPlan.weekStart);
  const weekEndDate = new Date(mealPlan.weekEnd);

  return (
    <div className="space-y-8">
      {/* Week Info */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200">
        <h2 className="text-2xl font-bold text-blue-900 mb-2">📅 Wochenplan</h2>
        <p className="text-blue-800">
          Woche vom {weekStartDate.toLocaleDateString('de-CH')} bis{' '}
          {weekEndDate.toLocaleDateString('de-CH')}
        </p>
      </div>

      {/* Child Allergies Info */}
      {childAllergies.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <h3 className="text-lg font-bold text-red-900 mb-3">⚠️ Allergie-Übersicht</h3>
          <div className="space-y-2">
            {childAllergies.map(allergy => (
              <div key={allergy.id} className="text-red-800">
                <span className="font-semibold">{allergy.allergen}</span>
                {allergy.notes && <span className="text-red-700 ml-2">({allergy.notes})</span>}
              </div>
            ))}
          </div>
          <p className="text-sm text-red-700 mt-4">
            🔴 Rot hervorgehobene Zutaten = Allergen von {childAllergies.length === 1 ? 'eurem Kind' : 'euren Kindern'}
          </p>
        </div>
      )}

      {/* Daily Meals */}
      <div className="bg-white rounded-2xl shadow-soft p-8">
        <div className="space-y-6">
          {meals.map((meal, index) => (
            <div key={index} className="border border-gray-200 rounded-xl p-6 hover:border-primary transition">
              <h3 className="text-lg font-bold text-gray-900 mb-4">{meal.day}</h3>

              <div className="space-y-4">
                {/* Breakfast */}
                <div>
                  <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                    <span className="text-xl mr-2">🥣</span>
                    Frühstück
                  </label>
                  <p className="text-gray-700 leading-relaxed">
                    {meal.breakfast ? highlightAllergens(meal.breakfast) : '—'}
                  </p>
                </div>

                {/* Lunch */}
                <div>
                  <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                    <span className="text-xl mr-2">🍽️</span>
                    Mittagessen
                  </label>
                  <p className="text-gray-700 leading-relaxed">
                    {meal.lunch ? highlightAllergens(meal.lunch) : '—'}
                  </p>
                </div>

                {/* Snack */}
                <div>
                  <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                    <span className="text-xl mr-2">🍎</span>
                    Nachmittags-Snack
                  </label>
                  <p className="text-gray-700 leading-relaxed">
                    {meal.snack ? highlightAllergens(meal.snack) : '—'}
                  </p>
                </div>

                {/* Notes */}
                {meal.notes && (
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-sm text-gray-600">
                      <span className="font-semibold">Anmerkung:</span> {meal.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Allergen Info Details */}
      {allergenInfo.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <h3 className="text-lg font-bold text-yellow-900 mb-4">ℹ️ Allergen-Details</h3>
          <div className="space-y-3">
            {allergenInfo.map((info, index) => (
              <div key={index} className="bg-white rounded-lg p-4 border border-yellow-100">
                <p className="font-semibold text-yellow-900">{info.allergen}</p>
                <p className="text-sm text-yellow-800 mt-1">{info.details}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
