// src/lib/grade.ts

export type GradingMode = 'relative' | 'absolute';

export type ComponentType =
	| 'Midsem'
	| 'Endsem'
	| 'Class Participation'
	| 'Quiz'
	| 'Assignment'
	| 'Graded Lab'
	| 'Lab Assignments'
	| 'Project'
	| 'Presentation'
	| 'Other';

export const COMPONENT_TYPES: ComponentType[] = [
	'Midsem',
	'Endsem',
	'Class Participation',
	'Quiz',
	'Assignment',
	'Graded Lab',
	'Lab Assignments',
	'Project',
	'Presentation',
	'Other'
];

// Component types that can be made up of multiple graded attempts
// (e.g. "best 2 out of 3 quizzes"), each entered as its own marks row.
// Project/Presentation are treated as one-off, like Midsem/Endsem —
// flip that here if you want best-of behavior for them too.
export const BEST_OF_TYPES: ComponentType[] = [
	'Quiz',
	'Assignment',
	'Graded Lab',
	'Lab Assignments',
	'Other'
];

export function needsBestOf(type: ComponentType): boolean {
	return BEST_OF_TYPES.includes(type);
}

/** One graded attempt within a component (e.g. "Quiz 2 of 3"). */
export interface MarksIteration {
	id: string;
	studentObtained: number;
	studentTotal: number;
	classAvgObtained: number;
	classAvgTotal: number;
}

export interface GradedComponent {
	id: string;
	type: ComponentType;
	/** Single weightage for the whole component — not per attempt. */
	weightage: number;
	/** "Best X" — how many top attempts count. Null = count all attempts entered. */
	bestOfCount: number | null;
	/** "/ Y" — how many attempts exist in total. Null/0/1 = not using best-of. */
	bestOfTotal: number | null;
	iterations: MarksIteration[];
	/** Placeholder for a component the student knows is coming but hasn't been graded/announced yet. */
	isFuture: boolean;
}

export interface Course {
	id: string;
	name: string;
	mode: GradingMode;
	components: GradedComponent[];
}

export function createEmptyIteration(id: string): MarksIteration {
	return {
		id,
		studentObtained: 0,
		studentTotal: 100,
		classAvgObtained: 0,
		classAvgTotal: 100
	};
}

export function createEmptyComponent(id: string): GradedComponent {
	return {
		id,
		type: 'Midsem',
		weightage: 0,
		bestOfCount: null,
		bestOfTotal: null,
		iterations: [createEmptyIteration(`${id}-iter-1`)],
		isFuture: false
	};
}

// Some component names are plural in the dropdown but should read
// singular when numbered, e.g. "Lab Assignments" -> "lab assignment 1".
const SINGULAR_OVERRIDES: Partial<Record<ComponentType, string>> = {
	'Lab Assignments': 'Lab Assignment'
};

/** e.g. attemptLabel('Quiz', 2) -> 'quiz 2', attemptLabel('Lab Assignments', 1) -> 'lab assignment 1' */
export function attemptLabel(type: ComponentType, index: number): string {
	const base = SINGULAR_OVERRIDES[type] ?? type;
	return `${base.toLowerCase()} ${index}`;
}

export function createEmptyCourse(id: string): Course {
	return {
		id,
		name: '',
		mode: 'relative',
		components: []
	};
}

/** How many marks-entry rows a component should currently show. */
export function requiredIterationCount(comp: Pick<GradedComponent, 'type' | 'bestOfTotal'>): number {
	if (!needsBestOf(comp.type)) return 1;
	if (!comp.bestOfTotal || comp.bestOfTotal < 1) return 1;
	return comp.bestOfTotal;
}

/**
 * Grows or shrinks a component's iteration list to match its current
 * "out of Y" value. Pass a fresh id each time an iteration is added.
 */
export function syncComponentIterations(
	comp: GradedComponent,
	makeId: () => string
): GradedComponent {
	const required = requiredIterationCount(comp);
	let iterations = comp.iterations;

	if (iterations.length < required) {
		const toAdd = required - iterations.length;
		const additions = Array.from({ length: toAdd }, () => createEmptyIteration(makeId()));
		iterations = [...iterations, ...additions];
	} else if (iterations.length > required) {
		iterations = iterations.slice(0, required);
	}

	return { ...comp, iterations };
}

/** Resets a component back to plain single-entry mode (used when switching away from a best-of type). */
export function resetToSingleIteration(comp: GradedComponent): GradedComponent {
	return {
		...comp,
		bestOfCount: null,
		bestOfTotal: null,
		iterations: comp.iterations.slice(0, 1)
	};
}