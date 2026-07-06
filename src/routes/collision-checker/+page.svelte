<script lang="ts">
	import CollisionChecker from "$lib/components/CollisionChecker.svelte";
	import Seo from "$lib/components/Seo.svelte";
</script>

<Seo
	title="UWE / CCC Clash Checker"
	description="Enter your batch to visualize your timetable, add UWE or CCC electives to spot clashes, and export as an image or to your calendar."
	image="collision-checker"
/>

<CollisionChecker />
