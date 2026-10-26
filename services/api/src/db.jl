module AxiomDB

using SQLite
using DBInterface
using Dates
using UUIDs

export get_db, init_db, log_audit_event

const DB_PATH = Ref{String}(joinpath(@__DIR__, "..", "..", "..", "artifacts", "axiom.sqlite"))
const DB_CONN = Ref{Union{Nothing, SQLite.DB}}(nothing)
const DB_LOCK = ReentrantLock()

function ensure_schema(db)
    schema_file = normpath(joinpath(@__DIR__, "..", "..", "..", "migrations", "001_initial_schema.sql"))
    if isfile(schema_file)
        sql = read(schema_file, String)
        statements = split(sql, ";")
        for stmt in statements
            s = strip(stmt)
            if !isempty(s)
                try
                    DBInterface.execute(db, s)
                catch e
                    # Ignore table already exists
                end
            end
        end
    end
    
    # Ensure default project exists
    try
        check = DBInterface.execute(db, "SELECT count(*) as cnt FROM projects WHERE id = 'default'")
        row = first(check)
        if row.cnt == 0
            DBInterface.execute(db, "INSERT INTO projects (id, name, description, created_at) VALUES (?, ?, ?, ?)",
                ("default", "Primary Scientific Laboratory", "Default research workspace for Physics-Informed Neural Networks", string(Dates.now()))
            )
        end
    catch
    end
end

function get_db()
    lock(DB_LOCK) do
        if DB_CONN[] === nothing
            mkpath(dirname(DB_PATH[]))
            db = SQLite.DB(DB_PATH[])
            DBInterface.execute(db, "PRAGMA journal_mode = WAL;")
            DBInterface.execute(db, "PRAGMA busy_timeout = 5000;")
            ensure_schema(db)
            DB_CONN[] = db
        end
        return DB_CONN[]
    end
end

function init_db()
    return get_db()
end

function log_audit_event(event_type::String, details_json::String)
    try
        db = get_db()
        lock(DB_LOCK) do
            DBInterface.execute(db, "INSERT INTO audit_events (id, event_type, details_json, created_at) VALUES (?, ?, ?, ?)",
                (string(UUIDs.uuid4()), event_type, details_json, string(Dates.now()))
            )
        end
    catch e
        @warn "Failed to record audit event" exception=e
    end
end

end # module AxiomDB
