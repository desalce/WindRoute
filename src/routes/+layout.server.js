/** @type {import('./$types').LayoutServerLoad} */
export function load({ locals }) {
	const u = locals.user;
	return {
		user: u ? { email: u.email, displayName: u.displayName } : null
	};
}
