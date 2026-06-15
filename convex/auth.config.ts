const issuerUrls = [
    process.env.CLERK_ISSUER_URL,
    process.env.CLERK_DEV_ISSUER_URL,
]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

export default {
    providers: issuerUrls.map((domain) => ({
        domain,
        applicationID: "convex",
    })),
};
