import { SHOPIFY_ENDPOINT, SHOPIFY_STOREFRONT_ACCESS_TOKEN } from '$env/static/private';

const gql = String.raw;

export async function shopifyFetch({ query, variables }) {
	const endpoint = SHOPIFY_ENDPOINT;
	const key = SHOPIFY_STOREFRONT_ACCESS_TOKEN;

	try {
		const result = await fetch(endpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-Shopify-Storefront-Access-Token': key
			},
			body: { query, variables } && JSON.stringify({ query, variables })
		});

		let body = await result.json();

		return {
			status: result.status,
			body: pruneEdges(body)
		};
	} catch (error) {
		console.error('Error:', error);
		return {
			status: 500,
			error: 'Error receiving data'
		};
	}
}

export async function getAllProducts() {
	return shopifyFetch({
		query: gql`
			{
				products(sortKey: TITLE, first: 100) {
					edges {
						node {
							id
							handle
							availableForSale
							title
							description
							descriptionHtml
							vendor
							options {
								id
								name
								values
							}
							priceRange {
								maxVariantPrice {
									amount
									currencyCode
								}
								minVariantPrice {
									amount
									currencyCode
								}
							}
							variants(first: 250) {
								pageInfo {
									hasNextPage
									hasPreviousPage
								}
								edges {
									node {
										id
										title
										sku
										availableForSale
										requiresShipping
										selectedOptions {
											name
											value
										}
										priceV2 {
											amount
											currencyCode
										}
										compareAtPriceV2 {
											amount
											currencyCode
										}
									}
								}
							}
							images(first: 20) {
								pageInfo {
									hasNextPage
									hasPreviousPage
								}
								edges {
									node {
										originalSrc
										altText
										width
										height
									}
								}
							}
						}
					}
				}
			}
		`
	});
}

export async function getAllCollections() {
	return shopifyFetch({
		query: gql`
			{
				collections(first: 100) {
					edges {
						node {
							handle
							title
							products(first: 100, sortKey: TITLE) {
								edges {
									node {
										id
										handle
										availableForSale
										title
										description
										descriptionHtml
										options {
											id
											name
											values
										}
										priceRange {
											maxVariantPrice {
												amount
												currencyCode
											}
											minVariantPrice {
												amount
												currencyCode
											}
										}
										variants(first: 250) {
											pageInfo {
												hasNextPage
												hasPreviousPage
											}
											edges {
												node {
													id
													title
													sku
													availableForSale
													requiresShipping
													selectedOptions {
														name
														value
													}
													priceV2 {
														amount
														currencyCode
													}
													compareAtPriceV2 {
														amount
														currencyCode
													}
												}
											}
										}
										images(first: 20) {
											pageInfo {
												hasNextPage
												hasPreviousPage
											}
											edges {
												node {
													originalSrc
													altText
													width
													height
												}
											}
										}
									}
								}
							}
						}
					}
				}
			}
		`
	});
}

export async function loadCart(cartId) {
	return shopifyFetch({
		query: gql`
			query GetCart($cartId: ID!) {
				cart(id: $cartId) {
					checkoutUrl
					estimatedCost {
						totalAmount {
							amount
						}
					}
					lines(first: 100) {
						edges {
							node {
								id
								quantity
								estimatedCost {
									subtotalAmount {
										amount
										currencyCode
									}
									totalAmount {
										amount
										currencyCode
									}
								}
								merchandise {
									... on ProductVariant {
										id
										title
										product {
											images(first: 1) {
												edges {
													node {
														originalSrc
														altText
														width
														height
													}
												}
											}
											title
										}
									}
								}
							}
						}
					}
				}
			}
		`,
		variables: { cartId }
	});
}

export async function getProduct(handle) {
	return shopifyFetch({
		query: gql`
			query getProduct($handle: String!) {
				productByHandle(handle: $handle) {
					id
					handle
					availableForSale
					title
					description
					descriptionHtml
					options {
						id
						name
						values
					}
					priceRange {
						maxVariantPrice {
							amount
							currencyCode
						}
						minVariantPrice {
							amount
							currencyCode
						}
					}
					variants(first: 250) {
						pageInfo {
							hasNextPage
							hasPreviousPage
						}
						edges {
							node {
								id
								title
								sku
								availableForSale
								requiresShipping
								selectedOptions {
									name
									value
								}
								priceV2 {
									amount
									currencyCode
								}
								compareAtPriceV2 {
									amount
									currencyCode
								}
							}
						}
					}
					images(first: 20) {
						pageInfo {
							hasNextPage
							hasPreviousPage
						}
						edges {
							node {
								originalSrc
								altText
								width
								height
							}
						}
					}
				}
			}
		`,
		variables: {
			handle
		}
	});
}

export async function createCart() {
	return shopifyFetch({
		query: gql`
			mutation calculateCart($lineItems: [CartLineInput!]) {
				cartCreate(input: { lines: $lineItems }) {
					cart {
						checkoutUrl
						id
					}
				}
			}
		`,
		variables: {}
	});
}

export async function updateCart({ cartId, lineId, variantId, quantity }) {
	return shopifyFetch({
		query: gql`
			mutation cartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
				cartLinesUpdate(cartId: $cartId, lines: $lines) {
					userErrors {
						field
						message
					}
				}
			}
		`,
		variables: {
			cartId: cartId,
			lines: [
				{
					id: lineId,
					merchandiseId: variantId,
					quantity: quantity
				}
			]
		}
	});
}

export async function addToCart({ cartId, variantId }) {
	return shopifyFetch({
		query: gql`
			mutation addToCart($cartId: ID!, $lines: [CartLineInput!]!) {
				cartLinesAdd(cartId: $cartId, lines: $lines) {
					cart {
						lines(first: 100) {
							edges {
								node {
									id
									quantity
									merchandise {
										... on ProductVariant {
											product {
												title
											}
										}
									}
								}
							}
						}
					}
				}
			}
		`,

		variables: {
			cartId: cartId,
			lines: [
				{
					merchandiseId: variantId,
					quantity: 1
				}
			]
		}
	});
}

export function pruneEdges(data) {
	let result = Array.isArray(data) ? [] : {};

	if (typeof data !== 'object') return data;

	for (const key in data) {
		if (typeof key === 'string' && key === 'edges') {
			result = pruneEdges(data.edges.map((edge) => edge.node));
		} else {
			result = Object.assign(result, {
				[key]: pruneEdges(data[key])
			});
		}
	}
	return result;
}
