"use client";

type DistrictProps = Record<string, any> | null;

export function DistrictModal({
    open,
    onClose,
    props,
}: {
    open: boolean;
    onClose: () => void;
    props: DistrictProps;
}) {
    if (!open || !props) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center text-black">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative z-10 w-full max-w-md rounded-xl bg-white p-5 shadow-2xl">
                <div className="mb-3 flex items-start justify-between">
                    <h2 className="text-lg font-semibold">
                        {props.name ?? props.DISTRICT ?? "District"}
                    </h2>
                    <button
                        onClick={onClose}
                        aria-label="Close"
                        className="rounded px-2 py-1 hover:bg-gray-100"
                    >
                        ✕
                    </button>
                </div>
                <div className="space-y-1 text-sm">
                    {/* Show a few common fields; adjust keys to your schema */}
                    {"OBJECTID" in props && (
                        <div>
                            <span className="font-medium">ID:</span>{" "}
                            {props.ID}
                        </div>
                    )}
                    {"DISTRICT" in props && (
                        <div>
                            <span className="font-medium">District:</span>{" "}
                            {props.DISTRICT}
                        </div>
                    )}
                    {"COMMISSION" in props && (
                        <div>
                            <span className="font-medium">Commissioner:</span>{" "}
                            {props.COMMISSION}
                        </div>
                    )}
                    {"area_km2" in props && (
                        <div>
                            <span className="font-medium">Area km²:</span>{" "}
                            {props.area_km2}
                        </div>
                    )}
                    {"pop" in props && (
                        <div>
                            <span className="font-medium">Population:</span>{" "}
                            {props.pop}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
