export interface MetaDeckCriterion {
	minQuantity: number;
	pokemonName: string;
}

export interface MetaDeckCriteriaRecord {
	id: string;
	archetype: string;
	criteria: MetaDeckCriterion[];
	criteriaText: string;
	startsAt: string;
	expiresAt: string;
	createdAt: string;
}

interface MetaDeckCriteriaRow {
	id: string;
	archetype: string;
	criteria_json: string;
	criteria_text: string;
	starts_at: string;
	expires_at: string;
	created_at: string;
}

function toRecord(row: MetaDeckCriteriaRow): MetaDeckCriteriaRecord {
	return {
		id: row.id,
		archetype: row.archetype,
		criteria: JSON.parse(row.criteria_json) as MetaDeckCriterion[],
		criteriaText: row.criteria_text,
		startsAt: row.starts_at,
		expiresAt: row.expires_at,
		createdAt: row.created_at,
	};
}

function formatCriteriaText(criteria: MetaDeckCriterion[]) {
	return criteria
		.map((criterion) => `${criterion.minQuantity} ${criterion.pokemonName}`)
		.join("\n");
}

export async function listActiveMetaDeckCriteria(
	db: D1Database
): Promise<MetaDeckCriteriaRecord[]> {
	const result = await db
		.prepare(
			`SELECT id,
			        archetype,
			        criteria_json,
			        criteria_text,
			        starts_at,
			        expires_at,
			        created_at
			 FROM meta_deck_criteria
			 WHERE DATE(expires_at) >= DATE('now')
			 ORDER BY DATE(expires_at) ASC, archetype ASC`
		)
		.all<MetaDeckCriteriaRow>();

	return (result.results ?? []).map(toRecord);
}

export async function getMetaDeckCriteriaForDate(
	db: D1Database,
	reportDate: string
): Promise<MetaDeckCriteriaRecord[]> {
	const result = await db
		.prepare(
			`SELECT id,
			        archetype,
			        criteria_json,
			        criteria_text,
			        starts_at,
			        expires_at,
			        created_at
			 FROM meta_deck_criteria
			 WHERE DATE(starts_at) <= DATE(?)
			   AND DATE(expires_at) >= DATE(?)
			 ORDER BY DATE(expires_at) ASC, archetype ASC`
		)
		.bind(reportDate, reportDate)
		.all<MetaDeckCriteriaRow>();

	return (result.results ?? []).map(toRecord);
}

export async function createMetaDeckCriteria(
	db: D1Database,
	input: {
		archetype: string;
		criteria: MetaDeckCriterion[];
		criteriaText?: string;
		startsAt: string;
		expiresAt: string;
		createdAt: string;
	}
): Promise<MetaDeckCriteriaRecord> {
	const id = crypto.randomUUID();
	const criteriaText = input.criteriaText || formatCriteriaText(input.criteria);

	await db
		.prepare(
			`INSERT INTO meta_deck_criteria (
				id,
				archetype,
				criteria_json,
				criteria_text,
				starts_at,
				expires_at,
				created_at
			) VALUES (?, ?, ?, ?, ?, ?, ?)`
		)
		.bind(
			id,
			input.archetype,
			JSON.stringify(input.criteria),
			criteriaText,
			input.startsAt,
			input.expiresAt,
			input.createdAt
		)
		.run();

	return {
		id,
		archetype: input.archetype,
		criteria: input.criteria,
		criteriaText,
		startsAt: input.startsAt,
		expiresAt: input.expiresAt,
		createdAt: input.createdAt,
	};
}

export async function deleteMetaDeckCriteria(
	db: D1Database,
	id: string
): Promise<void> {
	await db
		.prepare(`DELETE FROM meta_deck_criteria WHERE id = ?`)
		.bind(id)
		.run();
}
