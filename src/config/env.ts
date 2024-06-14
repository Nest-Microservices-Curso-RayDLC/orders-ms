import 'dotenv/config';
import * as joi from 'joi';

interface EnvVars {
    PORT: number;
    NATS_SERVERS: string;
}

const envsSchema = joi.object({
    PORT: joi.number().required(),
    NATS_SERVERS: joi.string().required(),
}).unknown(true);

const { value, error } = envsSchema.validate(process.env);

if (error) throw new Error(`Config validation error: ${error.message}`);

const envVars: EnvVars = value;

export const envs = {
    PORT: envVars.PORT,
    NATS_SERVERS: envVars.NATS_SERVERS,
}