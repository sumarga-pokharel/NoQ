import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { useOfficeRealtime } from "../hooks/useOfficeRealtime";
import QRCode from "qrcode";
import FormError from "../components/FormError";
import AsyncState from "../components/AsyncState";
import "./DashboardPage.css";

const HOURS = [22, 48, 86, 100, 71, 34, 52, 63, 29, 14];

const EMPTY_COUNTER = {
  id: null,
  name: "",
  compatibleServices: [],
  isActive: true,
};

const EMPTY_SERVICE = {
  id: null,
  name: "",
  category: "",
  avgMinutes: 5,
  prefix: "",
  isEmergency: false,
  isActive: true,
};

const EMPTY_WAITING = {
  tickets: [],
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 1,
};

export default function DashboardPage() {
  const { provider, token, updateProvider, updateDocuments } = useAuth();

  const [data, setData] = useState(null);
  const [services, setServices] = useState([]);
  const [waiting, setWaiting] = useState(EMPTY_WAITING);

  const [waitingFilters, setWaitingFilters] = useState({
    search: "",
    service: "",
    status: "",
    priority: "",
    page: 1,
    limit: 10,
  });

  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [counterForm, setCounterForm] = useState(null);
  const [serviceForm, setServiceForm] = useState(null);
  const [documentForm, setDocumentForm] = useState(null);
  const [profileForm, setProfileForm] = useState(null);
  const [walkInForm, setWalkInForm] = useState(null);
  const [notice, setNotice] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [formError, setFormError] = useState(null);

  const publicJoinUrl = `${window.location.origin}/join/${
    provider?.slug || ""
  }`;

  const refresh = useCallback(async () => {
    try {
      const params = new URLSearchParams(
        Object.entries(waitingFilters).filter(
          ([, value]) => value !== "",
        ),
      );

      const [dashboard, serviceData, waitingData] = await Promise.all([
        api("/tickets/dashboard", { token }),
        api("/services", { token }),
        api(`/tickets/waiting?${params}`, { token }),
      ]);

      setData(dashboard);
      setServices(serviceData.services);
      setWaiting(waitingData);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }, [token, waitingFilters]);

  useEffect(() => {
    refresh();

    const timer = setInterval(refresh, 5000);

    return () => clearInterval(timer);
  }, [refresh]);

  useOfficeRealtime(provider?.id, refresh);

  useEffect(() => {
    if (!provider?.slug) return undefined;

    let active = true;

    QRCode.toDataURL(publicJoinUrl, {
      width: 512,
      margin: 2,
      errorCorrectionLevel: "M",
      color: {
        dark: "#16201c",
        light: "#ffffff",
      },
    })
      .then((url) => {
        if (active) {
          setQrDataUrl(url);
        }
      })
      .catch(() => {
        if (active) {
          setError("Unable to generate the public QR code.");
        }
      });

    return () => {
      active = false;
    };
  }, [provider?.slug, publicJoinUrl]);

  const setWaitingFilter = (name, value) => {
    setWaitingFilters((current) => ({
      ...current,
      [name]: value,
      page: name === "page" ? value : 1,
    }));
  };

  const copyPublicLink = async () => {
    try {
      await navigator.clipboard.writeText(publicJoinUrl);
      setNotice("Public join link copied.");
    } catch {
      setError(
        "Your browser could not copy the public link. Select and copy it manually.",
      );
    }
  };

  const counterAction = async (id, action) => {
    setBusy(`${id}-${action}`);

    try {
      await api(`/counters/${id}/${action}`, {
        method: "POST",
        token,
      });

      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  };

  const toggleJoins = async () => {
    setBusy("joins");

    try {
      await updateProvider({
        isAcceptingJoins: !provider.isAcceptingJoins,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  };

  const openWalkIn = () => {
    const firstActiveService = services.find(
      (service) => service.isActive,
    );

    if (!firstActiveService) {
      return setError(
        "Activate or create a service before issuing a walk-in token.",
      );
    }

    setError("");
    setNotice("");

    setWalkInForm({
      serviceId: firstActiveService._id,
      priority: false,
    });
  };

  const addWalkIn = async (event) => {
    event.preventDefault();

    if (!walkInForm?.serviceId) {
      return setError("Select a service for the walk-in visitor.");
    }

    setBusy("walkin");
    setFormError(null);

    try {
      const { ticket } = await api("/tickets/walk-in", {
        method: "POST",
        token,
        body: walkInForm,
      });

      setWalkInForm(null);
      setNotice(
        `Walk-in token ${ticket.token} issued successfully.`,
      );

      await refresh();
    } catch (err) {
      setFormError({
        scope: "walkin",
        error: err,
      });
    } finally {
      setBusy("");
    }
  };

  const editCounter = (counter) => {
    setCounterForm({
      id: counter._id,
      name: counter.name,
      compatibleServices: counter.compatibleServices.map(
        (service) => service._id,
      ),
      isActive: counter.isActive,
    });
  };

  const toggleCounterService = (serviceId) => {
    setCounterForm((current) => ({
      ...current,
      compatibleServices:
        current.compatibleServices.includes(serviceId)
          ? current.compatibleServices.filter(
              (id) => id !== serviceId,
            )
          : [...current.compatibleServices, serviceId],
    }));
  };

  const saveCounter = async (event) => {
    event.preventDefault();

    if (!counterForm.name.trim()) {
      return setError("Counter name is required.");
    }

    setBusy("counter-save");
    setFormError(null);

    try {
      await api(
        counterForm.id
          ? `/counters/${counterForm.id}`
          : "/counters",
        {
          method: counterForm.id ? "PUT" : "POST",
          token,
          body: {
            name: counterForm.name.trim(),
            compatibleServices: counterForm.compatibleServices,
            isActive: counterForm.isActive,
          },
        },
      );

      setCounterForm(null);
      await refresh();
    } catch (err) {
      setFormError({
        scope: "counter",
        error: err,
      });
    } finally {
      setBusy("");
    }
  };

  const setCounterActive = async (counter) => {
    setBusy(`counter-active-${counter._id}`);

    try {
      await api(`/counters/${counter._id}`, {
        method: "PUT",
        token,
        body: {
          isActive: !counter.isActive,
        },
      });

      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  };

  const removeCounter = async (counter) => {
    if (
      !window.confirm(
        `Delete ${counter.name}? This cannot be undone.`,
      )
    ) {
      return;
    }

    setBusy(`counter-delete-${counter._id}`);

    try {
      await api(`/counters/${counter._id}`, {
        method: "DELETE",
        token,
      });

      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  };

  const editService = (service) => {
    setServiceForm({
      id: service._id,
      name: service.name,
      category: service.category || "",
      avgMinutes: service.avgMinutes,
      prefix: service.prefix,
      isEmergency: service.isEmergency,
      isActive: service.isActive,
    });
  };

  const saveService = async (event) => {
    event.preventDefault();

    setBusy("service-save");
    setFormError(null);

    try {
      await api(
        serviceForm.id
          ? `/services/${serviceForm.id}`
          : "/services",
        {
          method: serviceForm.id ? "PUT" : "POST",
          token,
          body: serviceForm,
        },
      );

      setServiceForm(null);
      await refresh();
    } catch (err) {
      setFormError({
        scope: "service",
        error: err,
      });
    } finally {
      setBusy("");
    }
  };

  const setServiceActive = async (service) => {
    setBusy(`service-active-${service._id}`);

    try {
      await api(`/services/${service._id}`, {
        method: "PUT",
        token,
        body: {
          isActive: !service.isActive,
        },
      });

      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  };

  const removeService = async (service) => {
    if (
      !window.confirm(
        `Delete ${service.name}? Services with ticket history must be deactivated instead.`,
      )
    ) {
      return;
    }

    setBusy(`service-delete-${service._id}`);

    try {
      await api(`/services/${service._id}`, {
        method: "DELETE",
        token,
      });

      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  };

  const openDocuments = () => {
    setDocumentForm(
      (provider.requiredDocuments || []).map((document) => ({
        id: document._id || crypto.randomUUID(),
        name: document.name,
        required: document.required !== false,
      })),
    );
  };

  const addDocument = () => {
    setDocumentForm((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        name: "",
        required: true,
      },
    ]);
  };

  const changeDocument = (id, updates) => {
    setDocumentForm((current) =>
      current.map((document) =>
        document.id === id
          ? { ...document, ...updates }
          : document,
      ),
    );
  };

  const removeDocument = (id) => {
    setDocumentForm((current) =>
      current.filter((document) => document.id !== id),
    );
  };

  const saveDocuments = async (event) => {
    event.preventDefault();

    setBusy("documents-save");
    setFormError(null);

    try {
      await updateDocuments(
        documentForm.map(({ name, required }) => ({
          name: name.trim(),
          required,
        })),
      );

      setDocumentForm(null);
    } catch (err) {
      setFormError({
        scope: "documents",
        error: err,
      });
    } finally {
      setBusy("");
    }
  };

  const openProfile = () => {
    setProfileForm({
      officeName: provider.officeName || "",
      address: provider.address || "",
      phone: provider.phone || "",
      lat: provider.location?.lat ?? "",
      lng: provider.location?.lng ?? "",
    });
  };

  const useCurrentOfficeLocation = () => {
    if (!window.isSecureContext || !navigator.geolocation) {
      return setError(
        "Location access requires a supported browser over a secure connection.",
      );
    }

    setBusy("profile-location");

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setProfileForm((current) => ({
          ...current,
          lat: coords.latitude.toFixed(6),
          lng: coords.longitude.toFixed(6),
        }));

        setBusy("");
      },
      (locationError) => {
        setError(
          locationError.code === 1
            ? "Location permission was denied."
            : "Unable to determine this device’s location.",
        );

        setBusy("");
      },
      {
        enableHighAccuracy: true,
        timeout: 12_000,
        maximumAge: 30_000,
      },
    );
  };

  const saveProfile = async (event) => {
    event.preventDefault();

    const hasLat = String(profileForm.lat).trim() !== "";
    const hasLng = String(profileForm.lng).trim() !== "";

    if (hasLat !== hasLng) {
      return setError(
        "Provide both latitude and longitude, or leave both blank.",
      );
    }

    setBusy("profile-save");
    setFormError(null);

    try {
      await updateProvider({
        officeName: profileForm.officeName,
        address: profileForm.address,
        phone: profileForm.phone,
        location: hasLat
          ? {
              lat: Number(profileForm.lat),
              lng: Number(profileForm.lng),
            }
          : null,
      });

      setProfileForm(null);
    } catch (err) {
      setFormError({
        scope: "profile",
        error: err,
      });
    } finally {
      setBusy("");
    }
  };

  if (!data) {
    return (
      <div className="dash">
        <AsyncState
          loading={!error}
          title={
            error
              ? "Dashboard unavailable"
              : "Loading live queue"
          }
          message={
            error ||
            "Fetching counters, services, and waiting tickets…"
          }
          onRetry={error ? refresh : undefined}
        />
      </div>
    );
  }

  const readyPercent = data.waitingCount
    ? Math.round(
        (data.documentsReadyCount / data.waitingCount) * 100,
      )
    : 100;

  const activeServices = services.filter(
    (service) => service.isActive,
  );

  const selectedWalkInService = activeServices.find(
    (service) => service._id === walkInForm?.serviceId,
  );

  return (
    <div className="dash">
      <div className="dash__head">
        <div>
          <h1>Today&rsquo;s queue</h1>
          <p>
            {provider.officeName} · {data.waitingCount} waiting
            right now
          </p>
        </div>

        <div className="dash__head-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={openProfile}
          >
            Office profile
          </button>

          <button
            type="button"
            className="btn btn-ghost"
            onClick={openDocuments}
          >
            Documents
          </button>

          <button
            type="button"
            className="btn btn-ghost"
            onClick={() =>
              setServiceForm({ ...EMPTY_SERVICE })
            }
          >
            + Service
          </button>

          <button
            type="button"
            className="btn btn-ghost"
            onClick={() =>
              setCounterForm({ ...EMPTY_COUNTER })
            }
          >
            + Counter
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={toggleJoins}
            disabled={busy === "joins"}
          >
            {provider.isAcceptingJoins
              ? "Pause new joins"
              : "Resume new joins"}
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={openWalkIn}
            disabled={busy === "walkin"}
          >
            Add walk-in token
          </button>
        </div>
      </div>

      {error && (
        <div className="dash__retry" role="alert">
          <span>{error}</span>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={refresh}
          >
            Retry
          </button>
        </div>
      )}

      {notice && (
        <div className="dash__notice" role="status">
          {notice}
        </div>
      )}

      {/* Walk-in form */}
      {walkInForm && (
        <form
          className="card dash__counter-form"
          onSubmit={addWalkIn}
        >
          <FormError
            error={
              formError?.scope === "walkin"
                ? formError.error
                : null
            }
          />

          <div className="dash__counter-form-head">
            <div>
              <h2>Issue walk-in token</h2>
              <p>
                Choose the visitor&rsquo;s service and whether
                they qualify for priority handling.
              </p>
            </div>

            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setWalkInForm(null)}
            >
              Close
            </button>
          </div>

          <label className="field">
            Service
            <select
              required
              value={walkInForm.serviceId}
              onChange={(event) =>
                setWalkInForm((current) => ({
                  ...current,
                  serviceId: event.target.value,
                }))
              }
              autoFocus
            >
              {activeServices.map((service) => (
                <option
                  key={service._id}
                  value={service._id}
                >
                  {service.name} ({service.prefix})
                  {service.isEmergency
                    ? " — Emergency"
                    : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="dash__counter-active">
            <input
              type="checkbox"
              checked={walkInForm.priority}
              onChange={(event) =>
                setWalkInForm((current) => ({
                  ...current,
                  priority: event.target.checked,
                }))
              }
            />
            Priority visitor (senior citizen, pregnant visitor,
            or person with disability)
          </label>

          {selectedWalkInService?.isEmergency && (
            <p className="dash__walkin-note">
              Emergency services are placed ahead of both
              priority and regular tickets.
            </p>
          )}

          <div className="dash__document-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setWalkInForm(null)}
            >
              Cancel
            </button>

            <button
              className="btn btn-primary"
              disabled={busy === "walkin"}
            >
              {busy === "walkin"
                ? "Issuing…"
                : "Issue token"}
            </button>
          </div>
        </form>
      )}

      {/* Counter form */}
      {counterForm && (
        <form
          className="card dash__counter-form"
          onSubmit={saveCounter}
        >
          <FormError
            error={
              formError?.scope === "counter"
                ? formError.error
                : null
            }
          />

          <div className="dash__counter-form-head">
            <div>
              <h2>
                {counterForm.id
                  ? "Edit counter"
                  : "Create counter"}
              </h2>
              <p>
                Leave every service unchecked to let this
                counter serve any queue.
              </p>
            </div>

            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setCounterForm(null)}
            >
              Close
            </button>
          </div>

          <label className="field">
            Counter name
            <input
              value={counterForm.name}
              onChange={(event) =>
                setCounterForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              placeholder="e.g. Counter 1"
              autoFocus
            />
          </label>

          <fieldset className="dash__counter-services">
            <legend>Compatible services</legend>

            {services.map((service) => (
              <label key={service._id}>
                <input
                  type="checkbox"
                  checked={counterForm.compatibleServices.includes(
                    service._id,
                  )}
                  onChange={() =>
                    toggleCounterService(service._id)
                  }
                />
                {service.name}
              </label>
            ))}
          </fieldset>

          <label className="dash__counter-active">
            <input
              type="checkbox"
              checked={counterForm.isActive}
              onChange={(event) =>
                setCounterForm((current) => ({
                  ...current,
                  isActive: event.target.checked,
                }))
              }
            />
            Active and available for queue operations
          </label>

          <button
            className="btn btn-primary"
            disabled={busy === "counter-save"}
          >
            {busy === "counter-save"
              ? "Saving…"
              : "Save counter"}
          </button>
        </form>
      )}

      {/* Service form */}
      {serviceForm && (
        <form
          className="card dash__counter-form"
          onSubmit={saveService}
        >
          <FormError
            error={
              formError?.scope === "service"
                ? formError.error
                : null
            }
          />

          <div className="dash__counter-form-head">
            <div>
              <h2>
                {serviceForm.id
                  ? "Edit service"
                  : "Create service"}
              </h2>
              <p>
                The average time drives visitor wait
                estimates.
              </p>
            </div>

            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setServiceForm(null)}
            >
              Close
            </button>
          </div>

          <div className="dash__service-fields">
            <label className="field">
              Service name
              <input
                value={serviceForm.name}
                onChange={(event) =>
                  setServiceForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="e.g. Property tax payment"
                autoFocus
              />
            </label>

            <label className="field">
              Category
              <input
                value={serviceForm.category}
                onChange={(event) =>
                  setServiceForm((current) => ({
                    ...current,
                    category: event.target.value,
                  }))
                }
                placeholder="Optional"
              />
            </label>

            <label className="field">
              Average minutes
              <input
                type="number"
                min="1"
                max="480"
                value={serviceForm.avgMinutes}
                onChange={(event) =>
                  setServiceForm((current) => ({
                    ...current,
                    avgMinutes: event.target.value,
                  }))
                }
              />
            </label>

            <label className="field">
              Token prefix
              <input
                maxLength="3"
                value={serviceForm.prefix}
                onChange={(event) =>
                  setServiceForm((current) => ({
                    ...current,
                    prefix: event.target.value.toUpperCase(),
                  }))
                }
                placeholder="P"
              />
            </label>
          </div>

          <label className="dash__counter-active">
            <input
              type="checkbox"
              checked={serviceForm.isEmergency}
              onChange={(event) =>
                setServiceForm((current) => ({
                  ...current,
                  isEmergency: event.target.checked,
                }))
              }
            />
            Emergency service—tickets jump ahead of regular
            and priority queues
          </label>

          <label className="dash__counter-active">
            <input
              type="checkbox"
              checked={serviceForm.isActive}
              onChange={(event) =>
                setServiceForm((current) => ({
                  ...current,
                  isActive: event.target.checked,
                }))
              }
            />
            Active and visible to visitors
          </label>

          <button
            className="btn btn-primary"
            disabled={busy === "service-save"}
          >
            {busy === "service-save"
              ? "Saving…"
              : "Save service"}
          </button>
        </form>
      )}

      {/* Documents form */}
      {documentForm && (
        <form
          className="card dash__counter-form"
          onSubmit={saveDocuments}
        >
          <FormError
            error={
              formError?.scope === "documents"
                ? formError.error
                : null
            }
          />

          <div className="dash__counter-form-head">
            <div>
              <h2>Required documents</h2>
              <p>
                These apply to new visitors. Existing tickets
                keep the checklist they joined with.
              </p>
            </div>

            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setDocumentForm(null)}
            >
              Close
            </button>
          </div>

          <div className="dash__document-list">
            {documentForm.map((document) => (
              <div
                className="dash__document-row"
                key={document.id}
              >
                <input
                  value={document.name}
                  maxLength="120"
                  required
                  onChange={(event) =>
                    changeDocument(document.id, {
                      name: event.target.value,
                    })
                  }
                  placeholder="Document name"
                />

                <label>
                  <input
                    type="checkbox"
                    checked={document.required}
                    onChange={(event) =>
                      changeDocument(document.id, {
                        required: event.target.checked,
                      })
                    }
                  />
                  Required
                </label>

                <button
                  type="button"
                  className="btn btn-ghost btn-sm dash__counter-delete"
                  onClick={() =>
                    removeDocument(document.id)
                  }
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          {!documentForm.length && (
            <p>
              No documents configured. Visitors will not see a
              checklist.
            </p>
          )}

          <div className="dash__document-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={addDocument}
            >
              + Add document
            </button>

            <button
              className="btn btn-primary"
              disabled={busy === "documents-save"}
            >
              {busy === "documents-save"
                ? "Saving…"
                : "Save documents"}
            </button>
          </div>
        </form>
      )}

      {/* Profile form */}
      {profileForm && (
        <form
          className="card dash__counter-form"
          onSubmit={saveProfile}
        >
          <FormError
            error={
              formError?.scope === "profile"
                ? formError.error
                : null
            }
          />

          <div className="dash__counter-form-head">
            <div>
              <h2>Office profile and location</h2>
              <p>
                Your existing public link stays unchanged when
                the office name changes.
              </p>
            </div>

            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setProfileForm(null)}
            >
              Close
            </button>
          </div>

          <div className="dash__profile-fields">
            <label className="field">
              Public office name
              <input
                required
                maxLength="120"
                value={profileForm.officeName}
                onChange={(event) =>
                  setProfileForm((current) => ({
                    ...current,
                    officeName: event.target.value,
                  }))
                }
              />
            </label>

            <label className="field">
              Public phone
              <input
                type="tel"
                maxLength="30"
                value={profileForm.phone}
                onChange={(event) =>
                  setProfileForm((current) => ({
                    ...current,
                    phone: event.target.value,
                  }))
                }
                placeholder="+977 01-5555555"
              />
            </label>

            <label className="field dash__profile-address">
              Address
              <input
                maxLength="240"
                value={profileForm.address}
                onChange={(event) =>
                  setProfileForm((current) => ({
                    ...current,
                    address: event.target.value,
                  }))
                }
                placeholder="Street, municipality, district"
              />
            </label>

            <label className="field">
              Latitude
              <input
                type="number"
                min="-90"
                max="90"
                step="any"
                value={profileForm.lat}
                onChange={(event) =>
                  setProfileForm((current) => ({
                    ...current,
                    lat: event.target.value,
                  }))
                }
                placeholder="27.7172"
              />
            </label>

            <label className="field">
              Longitude
              <input
                type="number"
                min="-180"
                max="180"
                step="any"
                value={profileForm.lng}
                onChange={(event) =>
                  setProfileForm((current) => ({
                    ...current,
                    lng: event.target.value,
                  }))
                }
                placeholder="85.3240"
              />
            </label>
          </div>

          <div className="dash__document-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={useCurrentOfficeLocation}
              disabled={busy === "profile-location"}
            >
              {busy === "profile-location"
                ? "Finding location…"
                : "Use this device’s location"}
            </button>

            <button
              className="btn btn-primary"
              disabled={busy === "profile-save"}
            >
              {busy === "profile-save"
                ? "Saving…"
                : "Save profile"}
            </button>
          </div>
        </form>
      )}

      {/* Stats */}
      <div className="dash__stats">
        <div className="card dash__stat">
          <div className="eyebrow">Waiting now</div>
          <div className="dash__stat-val">
            {data.waitingCount}
          </div>
        </div>

        <div className="card dash__stat">
          <div className="eyebrow">Average wait</div>
          <div className="dash__stat-val">
            {data.avgWaitMinutes}
            <span> min</span>
          </div>
        </div>

        <div className="card dash__stat">
          <div className="eyebrow">Served today</div>
          <div className="dash__stat-val">
            {data.servedToday}
          </div>
          <div className="dash__stat-note">
            of {data.issuedToday} issued
          </div>
        </div>

        <div className="card dash__stat">
          <div className="eyebrow">No-shows</div>
          <div className="dash__stat-val">
            {data.noShowToday}
          </div>
        </div>

        <div className="card dash__stat dash__stat--highlight">
          <div className="eyebrow">Documents ready</div>
          <div className="dash__stat-val">
            {readyPercent}
            <span>%</span>
          </div>
        </div>
      </div>

      {!services.length && (
        <AsyncState
          title="No services configured"
          message="Create a service before issuing walk-in tokens or accepting public joins."
          onRetry={() =>
            setServiceForm({ ...EMPTY_SERVICE })
          }
          retryLabel="Create service"
        />
      )}

      {/* Services */}
      <section className="dash__services">
        <div className="dash__section-head">
          <h2>Services</h2>
          <span>{services.length} configured</span>
        </div>

        <div className="dash__service-list">
          {services.map((service) => (
            <article
              className="card dash__service-card"
              key={service._id}
              data-active={service.isActive}
            >
              <div>
                <div className="dash__service-name">
                  <span>{service.prefix}</span>
                  {service.name}
                </div>

                <p>
                  {service.avgMinutes} min average
                  {service.category
                    ? ` · ${service.category}`
                    : ""}
                  {service.isEmergency
                    ? " · Emergency"
                    : ""}
                </p>
              </div>

              <span
                className={`badge ${
                  service.isActive
                    ? "badge-green"
                    : "badge-neutral"
                }`}
              >
                {service.isActive ? "Active" : "Inactive"}
              </span>

              <div className="dash__service-actions">
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => editService(service)}
                  disabled={Boolean(busy)}
                >
                  Edit
                </button>

                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setServiceActive(service)}
                  disabled={Boolean(busy)}
                >
                  {service.isActive
                    ? "Deactivate"
                    : "Activate"}
                </button>

                <button
                  className="btn btn-ghost btn-sm dash__counter-delete"
                  onClick={() => removeService(service)}
                  disabled={Boolean(busy)}
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Counters */}
      {!data.counters.length && (
        <AsyncState
          title="No counters configured"
          message="Add a counter to begin calling and serving tickets."
          onRetry={() =>
            setCounterForm({ ...EMPTY_COUNTER })
          }
          retryLabel="Create counter"
        />
      )}

      <div className="dash__counters">
        {data.counters.map((counter) => (
          <div
            className="card dash__counter"
            key={counter._id}
            data-status={
              counter.isActive
                ? counter.status
                : "inactive"
            }
          >
            <div className="dash__counter-top">
              <span className="dash__counter-name">
                {counter.name}
              </span>

              <span
                className={`badge badge-${
                  counter.isActive &&
                  counter.status === "serving"
                    ? "green"
                    : counter.isActive &&
                        counter.status === "waiting"
                      ? "amber"
                      : "neutral"
                }`}
              >
                {counter.isActive
                  ? counter.status
                  : "inactive"}
              </span>
            </div>

            <div className="dash__counter-token">
              {counter.currentTicket?.token || "—"}
            </div>

            <div className="dash__counter-meta">
              {counter.compatibleServices.length
                ? counter.compatibleServices
                    .map((s) => s.name)
                    .join(", ")
                : "All services"}
            </div>

            <div className="dash__counter-actions">
              <button
                className="btn btn-primary btn-sm"
                onClick={() =>
                  counterAction(
                    counter._id,
                    "call-next",
                  )
                }
                disabled={
                  Boolean(busy) ||
                  !counter.isActive ||
                  Boolean(counter.currentTicket)
                }
              >
                Call next
              </button>

              {counter.currentTicket?.status ===
                "called" && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() =>
                    counterAction(
                      counter._id,
                      "arrived",
                    )
                  }
                  disabled={Boolean(busy)}
                >
                  Visitor arrived
                </button>
              )}

              {counter.currentTicket?.status ===
                "serving" && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() =>
                    counterAction(
                      counter._id,
                      "complete",
                    )
                  }
                  disabled={Boolean(busy)}
                >
                  Complete ticket
                </button>
              )}

              <button
                className="btn btn-secondary btn-sm"
                onClick={() =>
                  counterAction(counter._id, "skip")
                }
                disabled={
                  Boolean(busy) ||
                  counter.currentTicket?.status !== "called"
                }
              >
                No-show
              </button>

              <button
                className="btn btn-ghost btn-sm"
                onClick={() => editCounter(counter)}
                disabled={Boolean(busy)}
              >
                Edit
              </button>

              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setCounterActive(counter)}
                disabled={Boolean(busy)}
              >
                {counter.isActive
                  ? "Deactivate"
                  : "Activate"}
              </button>

              <button
                className="btn btn-ghost btn-sm dash__counter-delete"
                onClick={() => removeCounter(counter)}
                disabled={
                  Boolean(busy) ||
                  Boolean(counter.currentTicket)
                }
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Waiting list */}
      <div className="dash__lower">
        <div className="card dash__waiting">
          <div className="dash__waiting-head">
            <div className="dash__waiting-title">
              Waiting list
            </div>

            <span className="badge badge-green">
              {waiting.total} matching
            </span>

            <div className="dash__waiting-updated">
              Live
            </div>
          </div>

          <div className="dash__waiting-filters">
            <input
              aria-label="Search waiting list"
              value={waitingFilters.search}
              onChange={(event) =>
                setWaitingFilter(
                  "search",
                  event.target.value,
                )
              }
              placeholder="Search token or phone"
            />

            <select
              aria-label="Filter by service"
              value={waitingFilters.service}
              onChange={(event) =>
                setWaitingFilter(
                  "service",
                  event.target.value,
                )
              }
            >
              <option value="">All services</option>

              {services.map((service) => (
                <option
                  key={service._id}
                  value={service._id}
                >
                  {service.name}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter by status"
              value={waitingFilters.status}
              onChange={(event) =>
                setWaitingFilter(
                  "status",
                  event.target.value,
                )
              }
            >
              <option value="">
                All active statuses
              </option>
              <option value="waiting">Waiting</option>
              <option value="called">Called</option>
              <option value="serving">Serving</option>
            </select>

            <select
              aria-label="Filter by priority"
              value={waitingFilters.priority}
              onChange={(event) =>
                setWaitingFilter(
                  "priority",
                  event.target.value,
                )
              }
            >
              <option value="">All priorities</option>
              <option value="priority">
                Priority only
              </option>
              <option value="regular">
                Regular only
              </option>
            </select>
          </div>

          <div className="dash__waiting-table">
            <div className="dash__waiting-row dash__waiting-row--head">
              <span>Token</span>
              <span>Visitor</span>
              <span>Service</span>
              <span>Status</span>
              <span>Documents</span>
            </div>

            {waiting.tickets.map((ticket) => {
              const confirmed = ticket.documents.filter(
                (document) => document.confirmed,
              ).length;

              return (
                <div
                  className="dash__waiting-row"
                  key={ticket._id}
                >
                  <span className="dash__waiting-token">
                    {ticket.token}
                  </span>

                  <span>
                    {ticket.phone || "Anonymous"}

                    {ticket.priority && (
                      <div className="dash__waiting-tag">
                        Priority
                      </div>
                    )}
                  </span>

                  <span>{ticket.service?.name}</span>

                  <span>
                    {ticket.status}
                    {ticket.counter?.name
                      ? ` · ${ticket.counter.name}`
                      : ""}
                  </span>

                  <span>
                    <span
                      className={`badge ${
                        confirmed === ticket.documents.length
                          ? "badge-green"
                          : "badge-red"
                      }`}
                    >
                      {confirmed} of{" "}
                      {ticket.documents.length}
                    </span>
                  </span>
                </div>
              );
            })}

            {!waiting.tickets.length && (
              <div className="dash__waiting-empty">
                No tickets match these filters.
              </div>
            )}
          </div>

          <div className="dash__waiting-pagination">
            <label>
              Rows{" "}
              <select
                value={waitingFilters.limit}
                onChange={(event) =>
                  setWaitingFilter(
                    "limit",
                    Number(event.target.value),
                  )
                }
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
              </select>
            </label>

            <span>
              Page {waiting.page} of{" "}
              {waiting.totalPages}
            </span>

            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={waiting.page <= 1}
              onClick={() =>
                setWaitingFilter(
                  "page",
                  waiting.page - 1,
                )
              }
            >
              Previous
            </button>

            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={
                waiting.page >= waiting.totalPages
              }
              onClick={() =>
                setWaitingFilter(
                  "page",
                  waiting.page + 1,
                )
              }
            >
              Next
            </button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="dash__side">

          <div className="card dash__qr">
            <div className="dash__chart-title">
              Public join QR code
            </div>

            <div className="dash__qr-row">
              {qrDataUrl ? (
                <img
                  className="dash__qr-code"
                  src={qrDataUrl}
                  alt={`QR code for ${provider.officeName} public queue`}
                />
              ) : (
                <div
                  className="dash__qr-code"
                  aria-label="Generating QR code"
                />
              )}
            </div>

            <div className="dash__qr-url">
              {publicJoinUrl}
            </div>

            <div className="dash__qr-actions">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={copyPublicLink}
              >
                Copy link
              </button>

              {qrDataUrl && (
                <a
                  className="btn btn-primary btn-sm"
                  href={qrDataUrl}
                  download={`${provider.slug}-join-qr.png`}
                >
                  Download PNG
                </a>
              )}

              <a
                className="btn btn-ghost btn-sm"
                href={publicJoinUrl}
                target="_blank"
                rel="noreferrer"
              >
                Open page
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}