import { defineCollection,reference, z } from 'astro:content';
import { glob } from 'astro/loaders'; 

const teams = defineCollection({
  loader: glob({pattern: "**/*.json", base: "./src/data/teams"}),
  schema: z.object({
    id: z.number(),
    school: z.string(),
    mascot: z.string().nullable(),
    abbreviation: z.string().nullable(),
    alt_name1: z.string().nullable(),
    alt_name2: z.string().nullable(),
    alt_name3: z.string().nullable(),
    conference: z.string().nullable(),
    classification: z.string().nullable(),
    color: z.string().nullable(),
    alt_color: z.string().nullable(),
    location: z.object({
      venue_id: z.number().nullable(),
      name: z.string().nullable(),
      city: z.string().nullable(),
      state: z.string().nullable(),
      zip: z.string().nullable(),
      country_code: z.string().nullable(),
      timezone: z.string().nullable(),
      latitude: z.coerce.number().nullable(),
      longitude: z.coerce.number().nullable(),
      elevation: z.coerce.number().nullable(),
      capacity: z.number().nullable(),
      year_constructed: z.number().nullable(),
      grass: z.coerce.boolean(),
      dome: z.coerce.boolean()
    })
  }),
});

const bowlseasons = defineCollection({
  loader: glob({pattern: "**/*.json", base: "./src/data/bowls"}),
  schema: z.array(z.object({
    id: z.number(),
    startDate: z.coerce.date(),
    attendance: z.coerce.number().nullable(),
    venueId: z.coerce.number().nullable(),
    venue: z.string().nullable(),
    homeId: z.number(),
    homeConference: z.string().nullable(),
    homePoints: z.number().nullable(),
    awayId: z.number(),
    awayConference: z.string().nullable(),
    awayPoints: z.number().nullable(),
    notes: z.string().nullable(),
  }))
})

const conferences = defineCollection({
  loader: glob({pattern: "**/*.json", base: "./src/data/conferences"}),
  schema: z.object({
    id: z.number(),
    name: z.string(),
    shortName: z.string().nullable(),
    abbreviation: z.string().nullable(),
    classification: z.string().nullable(),
    current:  z.array(z.object({
      id: reference('teams'),
      joined: z.number().nullable()
    })).optional(),
    past:  z.array(z.object({
      id: reference('teams'),
      joined: z.number().nullable(),
      left: z.number().nullable()
    })).optional(),
    future:  z.array(z.object({
      id: reference('teams'),
      joined: z.number().nullable()
    })).optional()
  })
})

export const collections = { teams, bowlseasons, conferences };