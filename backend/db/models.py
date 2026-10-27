from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, JSON, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from backend.db.session import Base

class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(String, primary_key=True)
    checksum = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    imported_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    is_active = Column(Boolean, default=False, index=True, nullable=False)
    source_files = Column(JSON, nullable=True)
    stats = Column(JSON, nullable=True)

    courses = relationship("Course", back_populates="dataset", cascade="all, delete-orphan")
    faculty = relationship("Faculty", back_populates="dataset", cascade="all, delete-orphan")
    offerings = relationship("Offering", back_populates="dataset", cascade="all, delete-orphan")
    meetings = relationship("Meeting", back_populates="dataset", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="dataset", cascade="all, delete-orphan")
    review_matches = relationship("ReviewMatch", back_populates="dataset", cascade="all, delete-orphan")
    faculty_ratings = relationship("FacultyRating", back_populates="dataset", cascade="all, delete-orphan")
    import_runs = relationship("ImportRun", back_populates="dataset", cascade="all, delete-orphan")

class Course(Base):
    __tablename__ = "courses"

    id = Column(String, primary_key=True)
    dataset_id = Column(String, ForeignKey("datasets.id", ondelete="CASCADE"), index=True, nullable=False)
    code = Column(String, index=True, nullable=False)
    title = Column(String, nullable=False)
    credits = Column(Integer, default=0, nullable=False)
    course_type = Column(String, nullable=True)
    raw_data = Column(JSON, nullable=True)

    dataset = relationship("Dataset", back_populates="courses")
    offerings = relationship("Offering", back_populates="course", cascade="all, delete-orphan")

class Faculty(Base):
    __tablename__ = "faculty"

    id = Column(String, primary_key=True)
    dataset_id = Column(String, ForeignKey("datasets.id", ondelete="CASCADE"), index=True, nullable=False)
    canonical_name = Column(String, index=True, nullable=False)
    raw_name = Column(String, nullable=False)
    clean_tokens = Column(JSON, nullable=True)
    is_placeholder = Column(Boolean, default=False, nullable=False)

    dataset = relationship("Dataset", back_populates="faculty")
    offerings = relationship("Offering", back_populates="faculty", cascade="all, delete-orphan")
    rating = relationship("FacultyRating", back_populates="faculty", uselist=False, cascade="all, delete-orphan")
    matches = relationship("ReviewMatch", back_populates="faculty", cascade="all, delete-orphan")

class Offering(Base):
    __tablename__ = "offerings"

    id = Column(String, primary_key=True)
    dataset_id = Column(String, ForeignKey("datasets.id", ondelete="CASCADE"), index=True, nullable=False)
    course_id = Column(String, ForeignKey("courses.id", ondelete="CASCADE"), index=True, nullable=False)
    faculty_id = Column(String, ForeignKey("faculty.id", ondelete="CASCADE"), index=True, nullable=False)
    theory_slots = Column(JSON, nullable=False)
    lab_session = Column(JSON, nullable=True)
    venue = Column(String, nullable=True)
    stable_key = Column(String, index=True, nullable=False)
    raw_row_ref = Column(JSON, nullable=True)

    dataset = relationship("Dataset", back_populates="offerings")
    course = relationship("Course", back_populates="offerings")
    faculty = relationship("Faculty", back_populates="offerings")
    meetings = relationship("Meeting", back_populates="offering", cascade="all, delete-orphan")

class Meeting(Base):
    __tablename__ = "meetings"

    id = Column(String, primary_key=True)
    dataset_id = Column(String, ForeignKey("datasets.id", ondelete="CASCADE"), index=True, nullable=False)
    offering_id = Column(String, ForeignKey("offerings.id", ondelete="CASCADE"), index=True, nullable=False)
    day = Column(String, index=True, nullable=False)
    start_min = Column(Integer, nullable=False)
    end_min = Column(Integer, nullable=False)
    kind = Column(String, nullable=False)
    slot_label = Column(String, nullable=False)

    dataset = relationship("Dataset", back_populates="meetings")
    offering = relationship("Offering", back_populates="meetings")

class Review(Base):
    __tablename__ = "reviews"

    id = Column(String, primary_key=True)
    dataset_id = Column(String, ForeignKey("datasets.id", ondelete="CASCADE"), index=True, nullable=False)
    review_id = Column(String, index=True, nullable=False)
    text = Column(Text, nullable=False)
    timestamp = Column(String, nullable=True)
    sender_hash = Column(String, nullable=False)
    source_zip = Column(String, nullable=True)
    source_file = Column(String, nullable=True)
    line_range = Column(JSON, nullable=True)
    explicit_rating = Column(JSON, nullable=True)
    confidence = Column(Float, default=0.0, nullable=False)
    reasons = Column(JSON, nullable=True)
    duplicate_group_id = Column(String, index=True, nullable=True)
    is_primary = Column(Boolean, default=True, nullable=False)

    dataset = relationship("Dataset", back_populates="reviews")

class ReviewMatch(Base):
    __tablename__ = "review_matches"

    id = Column(String, primary_key=True)
    dataset_id = Column(String, ForeignKey("datasets.id", ondelete="CASCADE"), index=True, nullable=False)
    review_id = Column(String, index=True, nullable=False)
    status = Column(String, index=True, nullable=False)
    faculty_id = Column(String, ForeignKey("faculty.id", ondelete="CASCADE"), nullable=True, index=True)
    score = Column(Float, default=0.0, nullable=False)
    candidates = Column(JSON, nullable=True)
    override_applied = Column(Boolean, default=False, nullable=False)

    dataset = relationship("Dataset", back_populates="review_matches")
    faculty = relationship("Faculty", back_populates="matches")

class FacultyRating(Base):
    __tablename__ = "faculty_ratings"

    id = Column(String, primary_key=True)
    dataset_id = Column(String, ForeignKey("datasets.id", ondelete="CASCADE"), index=True, nullable=False)
    faculty_id = Column(String, ForeignKey("faculty.id", ondelete="CASCADE"), index=True, nullable=False)
    review_count = Column(Integer, default=0, nullable=False)
    rated_count = Column(Integer, default=0, nullable=False)
    rating_mean = Column(Float, nullable=True)
    rating_median = Column(Float, nullable=True)
    rating_min = Column(Float, nullable=True)
    rating_max = Column(Float, nullable=True)
    rating_distribution = Column(JSON, nullable=True)
    bayesian_smoothed = Column(Float, nullable=True)
    last_review_date = Column(String, nullable=True)
    recurring_keywords = Column(JSON, nullable=True)
    low_sample = Column(Boolean, default=True, nullable=False)

    dataset = relationship("Dataset", back_populates="faculty_ratings")
    faculty = relationship("Faculty", back_populates="rating")

class Preference(Base):
    __tablename__ = "preferences"

    id = Column(String, primary_key=True)
    name = Column(String, index=True, nullable=False)
    payload = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

class Favourite(Base):
    __tablename__ = "favourites"

    id = Column(String, primary_key=True)
    offering_key = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    payload = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

class ImportRun(Base):
    __tablename__ = "import_runs"

    id = Column(String, primary_key=True)
    dataset_id = Column(String, ForeignKey("datasets.id", ondelete="CASCADE"), nullable=True)
    status = Column(String, nullable=False)
    logs = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    dataset = relationship("Dataset", back_populates="import_runs")
