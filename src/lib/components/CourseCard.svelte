<script lang="ts">

	import {
		COMPONENT_TYPES,
		needsBestOf,
		attemptLabel,
		createEmptyComponent,
		syncComponentIterations,
		resetToSingleIteration,
		type Course,
		type GradedComponent
	} from '$lib/grade';
	import {
		totalWeightage,
		studentTotalPct,
		classAvgTotalPct
	} from '$lib/gradeCalculations';
	import { generateId } from '$lib/id';

	export let course: Course;
	export let onRemove: (id: string) => void = () => {};

	function addComponent() {
		course.components = [...course.components, createEmptyComponent(generateId(`${course.id}-comp`))];
	}

	function removeComponent(id: string) {
		course.components = course.components.filter((c) => c.id !== id);
	}

	function replaceComponent(updated: GradedComponent) {
		course.components = course.components.map((c) => (c.id === updated.id ? updated : c));
	}

	function onBestOfChange(comp: GradedComponent) {
		replaceComponent(syncComponentIterations(comp, () => generateId(`${comp.id}-iter`)));
	}

	function onTypeChange(comp: GradedComponent) {
		if (!needsBestOf(comp.type)) {
			replaceComponent(resetToSingleIteration(comp));
		} else {
			onBestOfChange(comp);
		}
	}

	$: weightSum = totalWeightage(course.components);
	$: studentTotal = studentTotalPct(course.components);
	$: classAvgTotal = course.mode === 'relative' ? classAvgTotalPct(course.components) : null;

</script>

<div class="course-card">
	<div class="course-header">
		<input
			class="course-name-input"
			type="text"
			placeholder="Course name (e.g. CSD101)"
			bind:value={course.name}
		/>
		<button class="icon-btn" on:click={() => onRemove(course.id)} aria-label="Remove course">
			&times;
		</button>
	</div>

	<div class="mode-toggle">
		<span class="mode-label">Grading:</span>
		<button
			class="mode-btn"
			class:active={course.mode === 'relative'}
			on:click={() => (course.mode = 'relative')}
		>
			Relative
		</button>
		<button
			class="mode-btn"
			class:active={course.mode === 'absolute'}
			on:click={() => (course.mode = 'absolute')}
		>
			Absolute
		</button>
	</div>

	{#each course.components as comp (comp.id)}
		<div class="component-block">
			<div class="comp-top">
				<div class="comp-top-left">
					<span class="field-label">Graded component</span>
					<select class="select" bind:value={comp.type} on:change={() => onTypeChange(comp)}>
						{#each COMPONENT_TYPES as t}
							<option value={t}>{t}</option>
						{/each}
					</select>
				</div>

				<div class="weightage-field">
					<span class="field-label">Weightage %</span>
					<input type="number" min="0" max="100" class="mini-input" bind:value={comp.weightage} />
				</div>

				<label class="future-checkbox">
					<input type="checkbox" bind:checked={comp.isFuture} />
					Future component
				</label>

				<button
					class="icon-btn small"
					on:click={() => removeComponent(comp.id)}
					aria-label="Remove component"
				>
					&times;
				</button>
			</div>

			{#if !comp.isFuture}
				{#if needsBestOf(comp.type)}
					<div class="best-of-row">
						<span class="field-label">best</span>
						<input
							type="number"
							min="0"
							class="mini-input"
							bind:value={comp.bestOfCount}
							on:input={() => onBestOfChange(comp)}
						/>
						<span class="slash">/</span>
						<input
							type="number"
							min="1"
							class="mini-input"
							bind:value={comp.bestOfTotal}
							on:input={() => onBestOfChange(comp)}
						/>
					</div>
				{/if}

				{#if needsBestOf(comp.type) && comp.bestOfTotal === 1}
					<p class="note">
						Fill at least 2 attempts (set the second number above to 2+) for this to count toward
						the total — temporary limitation.
					</p>
				{:else}
					<div class="marks-table" class:with-avg={course.mode === 'relative'}>
						<div class="marks-header">
							<span></span>
							<span>Your marks</span>
							{#if course.mode === 'relative'}
								<span>Estimated class average</span>
							{/if}
						</div>

						{#each comp.iterations as it, i (it.id)}
							<div class="marks-row">
								<span class="marks-label">
									{comp.iterations.length > 1 ? attemptLabel(comp.type, i + 1) : ''}
								</span>

								<div class="marks-input">
									<input type="number" min="0" class="mini-input" bind:value={it.studentObtained} />
									<span class="slash">/</span>
									<input type="number" min="0" class="mini-input" bind:value={it.studentTotal} />
								</div>

								{#if course.mode === 'relative'}
									<div class="marks-input">
										<input type="number" min="0" class="mini-input" bind:value={it.classAvgObtained} />
										<span class="slash">/</span>
										<input type="number" min="0" class="mini-input" bind:value={it.classAvgTotal} />
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			{:else}
				<p class="future-note">Future component — nothing to track yet.</p>
			{/if}
		</div>
	{/each}

	<button class="add-btn" on:click={addComponent}>+ Add graded component</button>

	{#if weightSum !== 100 && course.components.length > 0}
		<p class="weight-warning">Weightage adds up to {weightSum}% (should total 100%)</p>
	{/if}

	<div class="totals">
		<div class="total-box">
			<span class="total-label">Total</span>
			<span class="total-value student">{studentTotal.toFixed(2)}%</span>
		</div>
		{#if course.mode === 'relative' && classAvgTotal !== null}
			<div class="total-box">
				<span class="total-label">Estimated class average total</span>
				<span class="total-value class-avg">{classAvgTotal.toFixed(2)}%</span>
			</div>
		{/if}
	</div>

</div>

<style>
	.course-card {
		background: linear-gradient(180deg, var(--bg-card, #0d0d0d), rgba(10, 10, 10, 0.4));
		border: 1px solid var(--border, #262626);
		border-radius: 14px;
		padding: 1.5rem;
		color: var(--text, #e5e7eb);
	}

	.course-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.course-name-input {
		flex: 1;
		background: var(--bg-input, #171717);
		border: 1px solid var(--border, #2e2e2e);
		border-radius: 10px;
		padding: 0.6rem 0.9rem;
		color: var(--text, #f5f5f5);
		font-size: 1rem;
		font-family: inherit;
	}

	.course-name-input:focus {
		outline: none;
		border-color: var(--border-hover, #525252);
	}

	.icon-btn {
		background: var(--bg-input, #171717);
		border: 1px solid var(--border, #2e2e2e);
		border-radius: 10px;
		color: var(--text-muted, #a3a3a3);
		width: 38px;
		height: 38px;
		font-size: 1.1rem;
		cursor: pointer;
		flex-shrink: 0;
	}
	.icon-btn:hover {
		color: var(--text, #f5f5f5);
		border-color: var(--border-hover, #525252);
	}
	.icon-btn.small {
		width: 30px;
		height: 30px;
		font-size: 0.95rem;
	}

	.mode-toggle {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		margin-bottom: 1.5rem;
	}
	.mode-label {
		font-family: var(--font-mono, monospace);
		font-size: 0.75rem;
		color: var(--text-secondary, #9ca3af);
	}
	.mode-btn {
		background: var(--bg-input, #171717);
		border: 1px solid var(--border, #2e2e2e);
		color: var(--text-secondary, #a3a3a3);
		border-radius: 999px;
		padding: 0.35rem 0.9rem;
		font-size: 0.85rem;
		cursor: pointer;
		font-family: inherit;
	}
	.mode-btn.active {
		background: var(--text, #f5f5f5);
		color: #0d0d0d;
		border-color: var(--text, #f5f5f5);
		font-weight: 600;
	}

	.component-block {
		background: var(--bg-input, #131313);
		border: 1px solid var(--border, #232323);
		border-radius: 12px;
		padding: 1rem 1.1rem;
		margin-bottom: 0.9rem;
	}

	.comp-top {
		display: flex;
		align-items: flex-end;
		flex-wrap: wrap;
		gap: 1.5rem;
		margin-bottom: 0.75rem;
	}

	.comp-top-left {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.weightage-field {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.field-label {
		font-family: var(--font-mono, monospace);
		font-size: 0.72rem;
		letter-spacing: 0.03em;
		color: var(--text-muted, #9ca3af);
	}

	.select {
		background: var(--bg-hover, #171717);
		border: 1px solid var(--border, #2e2e2e);
		border-radius: 10px;
		padding: 0.55rem 0.7rem;
		color: var(--text, #f5f5f5);
		font-size: 0.9rem;
		min-width: 180px;
		font-family: inherit;
	}
	.select:focus,
	.mini-input:focus {
		outline: none;
		border-color: var(--border-hover, #525252);
	}

	.future-checkbox {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-family: var(--font-mono, monospace);
		font-size: 0.78rem;
		color: var(--text-secondary, #d1d5db);
		cursor: pointer;
		margin-left: auto;
		padding-bottom: 0.35rem;
	}
	.future-checkbox input {
		width: 15px;
		height: 15px;
		accent-color: #60a5fa;
	}

	.best-of-row {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		margin-bottom: 0.85rem;
		font-family: var(--font-mono, monospace);
	}
	.best-of-row .field-label {
		font-family: var(--font-mono, monospace);
	}

	.mini-input {
		background: var(--bg-hover, #171717);
		border: 1px solid var(--border, #2e2e2e);
		border-radius: 8px;
		padding: 0.4rem 0.5rem;
		color: var(--text, #f5f5f5);
		width: 55px;
		font-size: 0.85rem;
		font-family: inherit;
	}

	.note {
		color: #fbbf24;
		font-size: 0.8rem;
		background: #1a1608;
		border: 1px solid #3a2f0d;
		border-radius: 8px;
		padding: 0.55rem 0.8rem;
		margin: 0;
	}

	.future-note {
		color: var(--text-muted, #6b7280);
		font-size: 0.82rem;
		font-style: italic;
		margin: 0;
	}

	.marks-table {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.marks-header {
		display: grid;
		grid-template-columns: 110px 1fr;
		gap: 1.25rem;
		font-family: var(--font-mono, monospace);
		font-size: 0.7rem;
		letter-spacing: 0.03em;
		color: var(--text-muted, #9ca3af);
		padding: 0 0.1rem;
	}
	.marks-table.with-avg .marks-header {
		grid-template-columns: 110px 1fr 1fr;
	}

	.marks-row {
		display: grid;
		grid-template-columns: 110px 1fr;
		gap: 1.25rem;
		align-items: center;
	}
	.marks-table.with-avg .marks-row {
		grid-template-columns: 110px 1fr 1fr;
	}

	.marks-label {
		font-size: 0.85rem;
		color: var(--text-secondary, #d1d5db);
	}

	.marks-input {
		display: flex;
		align-items: center;
		gap: 0.3rem;
	}
	.slash {
		color: var(--text-muted, #6b7280);
	}

	.add-btn {
		background: transparent;
		border: 1px dashed var(--border, #3f3f3f);
		color: var(--text-secondary, #d1d5db);
		border-radius: 10px;
		padding: 0.55rem 1rem;
		font-size: 0.85rem;
		cursor: pointer;
		margin-top: 0.3rem;
		margin-bottom: 1rem;
		font-family: inherit;
	}
	.add-btn:hover {
		border-color: var(--border-hover, #737373);
		color: var(--text, #ffffff);
	}

	.weight-warning {
		color: #fbbf24;
		font-size: 0.8rem;
		margin: -0.4rem 0 1rem;
	}

	.totals {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
		margin-bottom: 1.25rem;
	}
	.total-box {
		background: var(--bg-input, #171717);
		border: 1px solid var(--border, #2e2e2e);
		border-radius: 10px;
		padding: 0.75rem 1.1rem;
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		min-width: 160px;
	}
	.total-label {
		font-family: var(--font-mono, monospace);
		font-size: 0.7rem;
		color: var(--text-muted, #9ca3af);
		letter-spacing: 0.03em;
	}
	.total-value {
		font-size: 1.4rem;
		font-weight: 700;
	}
	.total-value.student {
		color: #60a5fa;
	}
	.total-value.class-avg {
		color: #fbbf24;
	}

	@media (max-width: 640px) {
		.course-card {
			padding: 1.1rem;
		}
		.course-header {
			flex-wrap: wrap;
		}
		.course-name-input {
			min-width: 0;
			width: 100%;
		}
		.mode-toggle {
			flex-wrap: wrap;
		}
		.comp-top {
			flex-direction: column;
			align-items: stretch;
			gap: 0.75rem;
		}
		.comp-top-left,
		.weightage-field {
			width: 100%;
		}
		.select {
			min-width: 0;
			width: 100%;
		}
		.future-checkbox {
			margin-left: 0;
		}
		.best-of-row {
			flex-wrap: wrap;
			row-gap: 0.5rem;
		}
		.marks-header,
		.marks-row,
		.marks-table.with-avg .marks-header,
		.marks-table.with-avg .marks-row {
			grid-template-columns: 1fr;
			gap: 0.4rem;
		}
		.marks-input {
			flex-wrap: wrap;
		}
		.mini-input {
			width: 100%;
			min-width: 0;
			max-width: 90px;
		}
		.totals {
			flex-direction: column;
		}
		.total-box {
			min-width: 0;
			width: 100%;
			box-sizing: border-box;
		}
	}
</style>