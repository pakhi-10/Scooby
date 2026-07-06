<script lang="ts">
	import ExamTimetable from "$lib/components/ExamTimetable.svelte";

	// Flip to true when a mid-sem / end-sem exam schedule is live.
	const examActive = false;
</script>

<svelte:head>
	<title>Scooby · Exam Timetable</title>
	<meta
		name="description"
		content="Search your courses and build your personal mid-sem or end-sem exam schedule. Export it as an image or to your calendar."
	/>
</svelte:head>

{#if examActive}
	<ExamTimetable />
{:else}
	<main class="empty">
		<div class="empty-inner">
			<span class="empty-icon" aria-hidden="true">📝</span>
			<h1>Exam Timetable</h1>
			<p class="empty-msg">
				There is no Mid/End Sem exam currently going on.
			</p>
			<a href="/" class="btn secondary">← Home</a>
		</div>
	</main>
{/if}

<style>
	.empty {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 4rem 1.5rem;
	}

	.empty-inner {
		text-align: center;
		max-width: 420px;
	}

	.empty-icon {
		font-size: 2.5rem;
		line-height: 1;
	}

	.empty-inner h1 {
		margin-top: 1rem;
		font-size: 1.75rem;
		font-weight: 700;
		letter-spacing: -0.02em;
	}

	.empty-msg {
		margin: 0.75rem 0 1.75rem;
		color: var(--text-secondary);
		font-size: 1rem;
	}

	.btn.secondary {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.6rem 1rem;
		font-size: 0.85rem;
		font-weight: 500;
		border-radius: var(--radius);
		border: 1px solid var(--border);
		background: var(--bg-card);
		color: var(--text);
		text-decoration: none;
		transition:
			background 0.15s,
			border-color 0.15s;
	}

	.btn.secondary:hover {
		background: var(--bg-hover);
		border-color: var(--border-hover);
	}
</style>
