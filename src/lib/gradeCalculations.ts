// src/lib/gradeCalculations.ts

import type { Course, GradedComponent } from '$lib/grade';
import { needsBestOf } from '$lib/grade';

type ScoreField = 'student' | 'classAvg';

/** Percentage scored for a single obtained/total pair. Safe against zero/empty totals. */
export function pct(obtained: number, total: number): number {
	if (!total || total <= 0) return 0;
	return (obtained / total) * 100;
}

/** Sum of weightage entered so far across a course's components. */
export function totalWeightage(components: GradedComponent[]): number {
	return components.reduce((sum, c) => sum + (Number(c.weightage) || 0), 0);
}

export interface ComponentScore {
	/** false only for the temporary "need at least 2 attempts" case. */
	valid: boolean;
	pctValue: number;
	note: string | null;
}

function iterationPct(
	it: { studentObtained: number; studentTotal: number; classAvgObtained: number; classAvgTotal: number },
	field: ScoreField
): number {
	return field === 'student'
		? pct(it.studentObtained, it.studentTotal)
		: pct(it.classAvgObtained, it.classAvgTotal);
}

/** Averages the top `bestOfCount` attempt percentages (or all of them if bestOfCount is unset). */
function averageOfBestAttempts(
	component: GradedComponent,
	field: ScoreField
): number {
	const allPcts = component.iterations.map((it) => iterationPct(it, field));
	const sorted = [...allPcts].sort((a, b) => b - a);
	const count =
		component.bestOfCount && component.bestOfCount > 0 && component.bestOfCount <= sorted.length
			? component.bestOfCount
			: sorted.length;
	const top = sorted.slice(0, count);
	if (top.length === 0) return 0;
	return top.reduce((sum, v) => sum + v, 0) / top.length;
}

/**
 * Scores a single component:
 * - Non best-of types, or best-of types with no "out of" filled in -> plain single-entry score.
 * - Best-of type with exactly 1 attempt -> invalid (temporary: needs at least 2 to average).
 * - Best-of type with 2+ attempts -> average of the top `bestOfCount` attempt percentages.
 */
export function computeComponentScore(
	component: GradedComponent,
	field: ScoreField = 'student'
): ComponentScore {
	const isBestOf = needsBestOf(component.type);

	if (!isBestOf || !component.bestOfTotal || component.bestOfTotal < 1) {
		const it = component.iterations[0];
		if (!it) return { valid: true, pctValue: 0, note: null };
		return { valid: true, pctValue: iterationPct(it, field), note: null };
	}

	if (component.bestOfTotal === 1) {
		return {
			valid: false,
			pctValue: 0,
			note: 'Fill at least 2 attempts (increase "out of") for this to count toward the total — temporary limitation.'
		};
	}

	return { valid: true, pctValue: averageOfBestAttempts(component, field), note: null };
}

/** Overall weighted total % for the student, across all components. Invalid components contribute 0. */
export function studentTotalPct(components: GradedComponent[]): number {
	return components.reduce((sum, c) => {
		const score = computeComponentScore(c, 'student');
		if (!score.valid) return sum;
		return sum + score.pctValue * ((Number(c.weightage) || 0) / 100);
	}, 0);
}

/** Overall weighted total % for the estimated class average (relative mode only). */
export function classAvgTotalPct(components: GradedComponent[]): number {
	return components.reduce((sum, c) => {
		const score = computeComponentScore(c, 'classAvg');
		if (!score.valid) return sum;
		return sum + score.pctValue * ((Number(c.weightage) || 0) / 100);
	}, 0);
}

