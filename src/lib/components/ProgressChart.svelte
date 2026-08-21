<script lang="ts">
	// labels/studentValues/classAvgValues come from buildChartSeries() in
	// $lib/gradeCalculations.ts — this component just draws them.
	export let labels: string[] = [];
	export let studentValues: number[] = [];
	export let classAvgValues: number[] | null = null;

	const width = 600;
	const height = 260;
	const padding = { top: 20, right: 20, bottom: 40, left: 40 };

	$: innerW = width - padding.left - padding.right;
	$: innerH = height - padding.top - padding.bottom;

	$: allValues = [...studentValues, ...(classAvgValues ?? [])];
	$: maxVal = Math.max(10, ...allValues, 0);
	$: axisMax = Math.ceil((maxVal + 5) / 10) * 10;

	function xFor(i: number) {
		if (labels.length <= 1) return padding.left + innerW / 2;
		return padding.left + (innerW * i) / (labels.length - 1);
	}
	function yFor(v: number) {
		return padding.top + innerH - (innerH * v) / axisMax;
	}

	function toPath(values: number[]) {
		if (!values || values.length === 0) return '';
		return values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)} ${yFor(v)}`).join(' ');
	}

	$: studentPath = toPath(studentValues);
	$: classAvgPath = classAvgValues ? toPath(classAvgValues) : '';

	$: gridLines = Array.from({ length: 5 }, (_, i) => (axisMax / 4) * i);
</script>

<div class="chart-wrap">
	{#if labels.length === 0}
		<p class="empty">Add graded components to see your progress chart.</p>
	{:else}
		<svg viewBox="0 0 {width} {height}" class="chart">
			{#each gridLines as g}
				<line
					x1={padding.left}
					x2={width - padding.right}
					y1={yFor(g)}
					y2={yFor(g)}
					class="grid-line"
				/>
				<text x={padding.left - 8} y={yFor(g) + 4} class="axis-label" text-anchor="end">
					{Math.round(g)}%
				</text>
			{/each}

			{#each labels as label, i}
				<text x={xFor(i)} y={height - padding.bottom + 18} class="axis-label" text-anchor="middle">
					{label}
				</text>
			{/each}

			{#if classAvgValues}
				<path d={classAvgPath} class="line class-avg-line" fill="none" />
				{#each classAvgValues as v, i}
					<circle cx={xFor(i)} cy={yFor(v)} r="3.5" class="dot class-avg-dot" />
				{/each}
			{/if}

			<path d={studentPath} class="line student-line" fill="none" />
			{#each studentValues as v, i}
				<circle cx={xFor(i)} cy={yFor(v)} r="3.5" class="dot student-dot" />
			{/each}
		</svg>

		<div class="legend">
			<div class="legend-item">
				<span class="swatch student-swatch"></span>
				Your progress
			</div>
			{#if classAvgValues}
				<div class="legend-item">
					<span class="swatch class-avg-swatch"></span>
					Class average
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.chart-wrap {
		width: 100%;
	}
	.chart {
		width: 100%;
		height: auto;
		display: block;
	}
	.empty {
		color: #6b7280;
		font-size: 0.875rem;
		padding: 1rem 0;
	}
	.grid-line {
		stroke: #262626;
		stroke-width: 1;
	}
	.axis-label {
		fill: #9ca3af;
		font-size: 10px;
		font-family: inherit;
	}
	.line {
		stroke-width: 2.5;
	}
	.student-line {
		stroke: #60a5fa;
	}
	.class-avg-line {
		stroke: #fbbf24;
	}
	.dot {
		stroke-width: 0;
	}
	.student-dot {
		fill: #60a5fa;
	}
	.class-avg-dot {
		fill: #fbbf24;
	}
	.legend {
		display: flex;
		gap: 1.25rem;
		margin-top: 0.5rem;
		padding-left: 0.5rem;
	}
	.legend-item {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.8rem;
		color: #d1d5db;
	}
	.swatch {
		width: 12px;
		height: 12px;
		border-radius: 3px;
		display: inline-block;
	}
	.student-swatch {
		background: #60a5fa;
	}
	.class-avg-swatch {
		background: #fbbf24;
	}
</style>