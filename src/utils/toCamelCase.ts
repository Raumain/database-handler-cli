export function toCamelCase(str: string): string {
	return str
		.replace(/(?:^\w|[A-Z]|\b\w|\s+|-+)/g, (match, index) =>
			index === 0 ? match.toLowerCase() : match.toUpperCase(),
		)
		.replace(/\s+/g, "")
		.replace(/-/g, "");
}
