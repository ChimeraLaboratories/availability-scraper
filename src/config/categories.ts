import type {
    DashboardCategory,
} from "../types/dashboard.js";

export const dashboardCategories: DashboardCategory[] = [
    {
        key: "adult-eye-test",
        label: "Adult Eye Test",
        lineOfBusiness: "OPTICAL",
        slotType: "ADULT_EYE_TEST",
        filters: {},
    },
    {
        key: "child-eye-test-weekend",
        label: "Child Eye Test - Weekend",
        lineOfBusiness: "OPTICAL",
        slotType: "CHILD_EYE_TEST",
        filters: {
            weekendsOnly: true,
        },
    },
    {
        key: "child-eye-test-after-4pm",
        label: "Child Eye Test - After 4pm",
        lineOfBusiness: "OPTICAL",
        slotType: "CHILD_EYE_TEST",
        filters: {
            afterTime: "16:00:00",
        },
    },
    {
        key: "contact-lens-check",
        label: "Contact Lens Check",
        lineOfBusiness: "OPTICAL",
        slotType: "CONTACT_LENS_AFTERCARE_CHECK_UP",
        filters: {},
    },
    {
        key: "contact-lens-fit",
        label: "Contact Lens Fit",
        lineOfBusiness: "OPTICAL",
        slotType: "CONTACT_LENS_ASSESSMENT_OR_TRIAL",
        filters: {},
    },
    {
        key: "ear-wax-removal",
        label: "Ear Wax Removal",
        lineOfBusiness: "AUDIOLOGY",
        slotType: "EAR_WAX_REMOVAL",
        filters: {},
    },
    {
        key: "hearing-appointment",
        label: "Hearing Appointment (Test/Repair/etc)",
        lineOfBusiness: "AUDIOLOGY",
        slotType: "HEARING_AID_MAINTENANCE_OR_REPAIR",
        filters: {},
    },
];