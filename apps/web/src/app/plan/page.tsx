import {
  parseWeekParam,
  formatWeekKey,
  addWeeks,
} from "@/lib/week";
import { MealPlanner } from "@/components/MealPlanner";

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week: weekParam } = await searchParams;
  const monday = parseWeekParam(weekParam);
  const week = formatWeekKey(monday);
  const prevWeek = formatWeekKey(addWeeks(monday, -1));
  const nextWeek = formatWeekKey(addWeeks(monday, 1));

  return (
    <div className="container">
      <h1>Weekly meal plan</h1>
      <p className="muted">
        Assign recipes to days, adjust serving multipliers, and get a combined
        shopping list. Everyone shares the same plan.
      </p>
      <MealPlanner week={week} prevWeek={prevWeek} nextWeek={nextWeek} />
    </div>
  );
}
