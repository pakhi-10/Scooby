<script lang="ts">
	import CollisionChecker from "$lib/components/CollisionChecker.svelte";
</script>

<svelte:head>
	<title>Scooby · UWE/CCC Collision Checker</title>
	<meta
		name="description"
		content="Enter your batch to visualize your timetable, add UWE or electives to check for conflicts, and export as an image or to your calendar."
	/>
</svelte:head>

<CollisionChecker />
