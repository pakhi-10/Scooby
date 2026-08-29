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
	weightage: number;
	bestOfCount: number | null;
	bestOfTotal: number | null;
	iterations: MarksIteration[];
	isFuture: boolean;
	/** 1-based chronological position of this component, set by the student via the order dropdown. */
	order: number;
}

export interface Course {
	id: string;
	name: string;
	mode: GradingMode;
	components: GradedComponent[];
	/** The percentage the student is aiming for in this course. */
	targetPct: number;
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
		isFuture: false,
		order: 1
	};
}

const SINGULAR_OVERRIDES: Partial<Record<ComponentType, string>> = {
	'Lab Assignments': 'Lab Assignment'
};

export function attemptLabel(type: ComponentType, index: number): string {
	const base = SINGULAR_OVERRIDES[type] ?? type;
	return `${base.toLowerCase()} ${index}`;
}

export function createEmptyCourse(id: string): Course {
	return {
		id,
		name: '',
		mode: 'relative',
		components: [],
		targetPct: 0
	};
}

export function requiredIterationCount(comp: Pick<GradedComponent, 'type' | 'bestOfTotal'>): number {
	if (!needsBestOf(comp.type)) return 1;
	if (!comp.bestOfTotal || comp.bestOfTotal < 1) return 1;
	return comp.bestOfTotal;
}

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

export function resetToSingleIteration(comp: GradedComponent): GradedComponent {
	return {
		...comp,
		bestOfCount: null,
		bestOfTotal: null,
		iterations: comp.iterations.slice(0, 1)
	};
}

/**
 * Reassigns `order` across all components to a clean 1..N sequence based on
 * each component's current relative order. Use after removing a component so
 * the remaining dropdown values stay contiguous.
 */
export function renumberOrders(components: GradedComponent[]): GradedComponent[] {
	const sorted = [...components].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
	const positionById = new Map(sorted.map((c, i) => [c.id, i + 1]));
	return components.map((c) => ({ ...c, order: positionById.get(c.id) ?? c.order }));
}

/**
 * Sets one component's order to `newOrder`, swapping with whichever other
 * component currently holds that slot so the set of orders stays a valid
 * 1..N permutation instead of ending up with duplicates.
 */
export function setComponentOrder(
	components: GradedComponent[],
	id: string,
	newOrder: number
): GradedComponent[] {
	const target = components.find((c) => c.id === id);
	if (!target) return components;
	const oldOrder = target.order;
	if (newOrder === oldOrder) return components;

	return components.map((c) => {
		if (c.id === id) return { ...c, order: newOrder };
		if (c.order === newOrder) return { ...c, order: oldOrder };
		return c;
	});
}