from pydantic import BaseModel


class DataSourceOut(BaseModel):
    id: int
    name: str
    office_id: int
    office: str
