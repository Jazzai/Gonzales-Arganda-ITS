from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    cors_origins: str
    llm_base_url: str
    llm_model: str
    llm_temperature: float
    compiler: str
    compile_timeout_s: float
    run_timeout_s: float
    log_path: str

settings = Settings()