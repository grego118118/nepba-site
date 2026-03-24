"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Printer, RotateCcw } from "lucide-react";

export default function DuesDeductionPage() {
    const [formData, setFormData] = useState({
        employeeName: "",
        identificationNo: "",
        homeAddress: "",
        cityState: "",
        zipCode: "",
        phone: "",
        department: "",
        localNumber: "190",
        duesType: "",
    });

    // Fixed dues amounts
    const WEEKLY_DUES = "14.00";
    const BIWEEKLY_DUES = "28.00";

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        if (type === "checkbox") {
            setFormData(prev => ({
                ...prev,
                duesType: checked ? value : ""
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const handleClear = () => {
        setFormData({
            employeeName: "",
            identificationNo: "",
            homeAddress: "",
            cityState: "",
            zipCode: "",
            phone: "",
            department: "",
            localNumber: "190",
            duesType: "",
        });
    };

    return (
        <main className="min-h-screen bg-slate-900 text-slate-100 print:bg-white print:text-black">
            <div className="mx-auto max-w-4xl px-4 py-8 md:px-8 md:py-12">

                {/* Back Link - Hidden on Print */}
                <div className="mb-6 print:hidden">
                    <Link
                        href="/dashboard/benefits"
                        className="text-xs font-medium text-slate-500 hover:text-blue-400 transition-colors flex items-center gap-1 group"
                    >
                        <span className="group-hover:-translate-x-1 transition-transform">←</span> Back to Benefits
                    </Link>
                </div>

                {/* Form Container */}
                <div className="bg-white text-gray-900 rounded-xl shadow-2xl p-8 md:p-10 print:shadow-none print:p-6 print:rounded-none">

                    {/* Header with Logo */}
                    <div className="flex items-start gap-6 mb-6">
                        {/* NEPBA Logo - Larger */}
                        <div className="flex-shrink-0">
                            <Image
                                src="/images/nepba-logo.png"
                                alt="NEPBA Logo"
                                width={120}
                                height={120}
                                className="object-contain"
                            />
                        </div>
                        <div className="flex-1 text-center md:text-left">
                            <h1 className="text-xl md:text-2xl font-bold text-blue-800">
                                New England Police Benevolent Association, Inc.
                            </h1>
                            <p className="text-sm italic text-gray-600 mt-1">
                                "Representing New England's Finest"
                            </p>
                            <p className="text-xs text-gray-600 mt-1">
                                NEPBA Building & Headquarters – 7 Technology Drive, Suite 200
                            </p>
                            <p className="text-xs text-gray-600">
                                Chelmsford, Massachusetts 01863
                            </p>
                        </div>
                    </div>

                    {/* Fill In All Boxes Banner */}
                    <div className="bg-gradient-to-r from-blue-800 to-blue-600 text-white py-2 px-4 mb-6 text-center">
                        <p className="font-bold text-sm tracking-wide">FILL IN ALL BOXES MARKED WITH AN (X)</p>
                    </div>

                    {/* Request Title */}
                    <div className="text-center mb-8">
                        <p className="text-sm font-bold text-gray-900 leading-relaxed">
                            REQUEST AND AUTHORIZATION FOR VOLUNTARY ALLOTMENT OF COMPENSATION FOR PAYMENT OF EMPLOYEE ORGANIZATION DUES AND REQUEST THE NEW ENGLAND POLICE BENEVOLENT ASSOCIATION TO ACT AS MY EXCLUSIVE COLLECTIVE BARGAINING AGENT
                        </p>
                    </div>

                    <form>
                        {/* Employee Information Section */}
                        <section className="mb-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <p className="text-xs font-bold text-gray-700 mb-1">
                                        NAME OF EMPLOYEE <span className="font-normal italic">(Print Last Name, First, Middle)</span>
                                    </p>
                                    <div className="flex items-center">
                                        <span className="text-sm font-bold mr-2">(X)</span>
                                        <input
                                            type="text"
                                            name="employeeName"
                                            value={formData.employeeName || ""}
                                            onChange={handleInputChange}
                                            className="flex-1 px-3 py-2 border-b-2 border-gray-900 text-sm focus:outline-none focus:bg-yellow-50 print:border-b print:border-black"
                                            placeholder="Last, First, Middle"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-700 mb-1">
                                        IDENTIFICATION NO. <span className="font-normal italic">(Soc. Sec. or Other)</span>
                                    </p>
                                    <div className="flex items-center">
                                        <span className="text-sm font-bold mr-2">(X)</span>
                                        <input
                                            type="text"
                                            name="identificationNo"
                                            value={formData.identificationNo || ""}
                                            onChange={handleInputChange}
                                            className="flex-1 px-3 py-2 border-b-2 border-gray-900 text-sm focus:outline-none focus:bg-yellow-50 print:border-b print:border-black"
                                            placeholder="SSN or Employee ID"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4">
                                <div className="md:col-span-3">
                                    <p className="text-xs font-bold text-gray-700 mb-1">
                                        HOME ADDRESS <span className="font-normal italic">(Street and Number)</span>
                                    </p>
                                    <div className="flex items-center">
                                        <span className="text-sm font-bold mr-2">(X)</span>
                                        <input
                                            type="text"
                                            name="homeAddress"
                                            value={formData.homeAddress || ""}
                                            onChange={handleInputChange}
                                            className="flex-1 px-3 py-2 border-b-2 border-gray-900 text-sm focus:outline-none focus:bg-yellow-50 print:border-b print:border-black"
                                            placeholder="123 Main Street"
                                        />
                                    </div>
                                </div>
                                <div className="md:col-span-2">
                                    <p className="text-xs font-bold text-gray-700 mb-1">CITY AND STATE</p>
                                    <div className="flex items-center">
                                        <span className="text-sm font-bold mr-2">(X)</span>
                                        <input
                                            type="text"
                                            name="cityState"
                                            value={formData.cityState || ""}
                                            onChange={handleInputChange}
                                            className="flex-1 px-3 py-2 border-b-2 border-gray-900 text-sm focus:outline-none focus:bg-yellow-50 print:border-b print:border-black"
                                            placeholder="Boston, MA"
                                        />
                                    </div>
                                </div>
                                <div className="md:col-span-1">
                                    <p className="text-xs font-bold text-gray-700 mb-1">ZIP CODE</p>
                                    <input
                                        type="text"
                                        name="zipCode"
                                        value={formData.zipCode || ""}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border-b-2 border-gray-900 text-sm focus:outline-none focus:bg-yellow-50 print:border-b print:border-black"
                                        placeholder="02101"
                                        maxLength={10}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <p className="text-xs font-bold text-gray-700 mb-1">PHONE</p>
                                    <div className="flex items-center">
                                        <span className="text-sm font-bold mr-2">(X)</span>
                                        <input
                                            type="tel"
                                            name="phone"
                                            value={formData.phone || ""}
                                            onChange={handleInputChange}
                                            className="flex-1 px-3 py-2 border-b-2 border-gray-900 text-sm focus:outline-none focus:bg-yellow-50 print:border-b print:border-black"
                                            placeholder="(555) 123-4567"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-700 mb-1">DEPARTMENT</p>
                                    <div className="flex items-center">
                                        <span className="text-sm font-bold mr-2">(X)</span>
                                        <input
                                            type="text"
                                            name="department"
                                            value={formData.department || ""}
                                            onChange={handleInputChange}
                                            className="flex-1 px-3 py-2 border-b-2 border-gray-900 text-sm focus:outline-none focus:bg-yellow-50 print:border-b print:border-black"
                                            placeholder="Police Department Name"
                                        />
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Employee Organization Section */}
                        <section className="mb-6 pt-4 border-t border-gray-300">
                            <p className="text-xs font-bold text-gray-700 mb-2">NAME OF EMPLOYEE ORGANIZATION</p>
                            <h2 className="text-lg font-bold text-gray-900">
                                NEW ENGLAND POLICE BENEVOLENT ASSOCIATION LOCAL{" "}
                                <span className="underline decoration-2 underline-offset-4">190</span>
                            </h2>
                        </section>

                        {/* Dues Amount Display */}
                        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200 print:bg-gray-50 print:border-gray-300">
                            <p className="text-sm font-bold text-blue-800 mb-2">Current Dues Rate:</p>
                            <div className="flex flex-wrap gap-4">
                                <span className="text-lg font-bold text-gray-900">${WEEKLY_DUES} per week</span>
                                <span className="text-gray-500 hidden md:inline">|</span>
                                <span className="text-lg font-bold text-gray-900">${BIWEEKLY_DUES} bi-weekly</span>
                            </div>
                        </div>

                        {/* Certification Section 1 - Regular Dues */}
                        <section className="mb-6">
                            <div className="flex items-start gap-3">
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        name="duesType"
                                        value="regular"
                                        checked={formData.duesType === "regular"}
                                        onChange={handleInputChange}
                                        className="w-5 h-5 mt-1 cursor-pointer flex-shrink-0"
                                    />
                                    <span className="text-sm leading-relaxed text-gray-800">
                                        I hereby certify that the regular dues of New England PBA for the above named member are currently established at{" "}
                                        <span className="font-bold text-gray-900">${WEEKLY_DUES}</span> per week (<span className="font-bold text-gray-900">${BIWEEKLY_DUES}</span> bi-weekly).
                                        I acknowledge I may withdraw from the Union only during the month of July of each year and with written notice to the Union and the City / Town.
                                    </span>
                                </label>
                            </div>
                        </section>

                        {/* Certification Section 2 - Non-Dues Paying */}
                        <section className="mb-8">
                            <div className="flex items-start gap-3">
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        name="duesType"
                                        value="non-dues"
                                        checked={formData.duesType === "non-dues"}
                                        onChange={handleInputChange}
                                        className="w-5 h-5 mt-1 cursor-pointer flex-shrink-0"
                                    />
                                    <span className="text-sm leading-relaxed text-gray-800">
                                        I hereby certify that the employee listed above wishes to not be a dues paying member of New England PBA and acknowledges any individual need for Union services shall be required to pay an hourly rate which shall be determined by the Executive Committee.
                                    </span>
                                </label>
                            </div>
                        </section>

                        {/* Authorized Office Signature */}
                        <section className="mb-8 pt-6 border-t border-gray-300">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                                <div className="md:col-span-2">
                                    <div className="h-12 border-b-2 border-gray-900 mb-1"></div>
                                    <p className="text-xs font-bold text-gray-700">
                                        (X) SIGNATURE AND TITLE OF AUTHORIZED OFFICE <span className="font-normal italic">(President or Treasurer)</span>
                                    </p>
                                </div>
                                <div>
                                    <div className="h-12 border-b-2 border-gray-900 mb-1"></div>
                                    <p className="text-xs font-bold text-gray-700">(X) DATE</p>
                                </div>
                            </div>
                        </section>

                        {/* Authorization Statement */}
                        <section className="mb-8">
                            <div className="bg-gray-100 p-4 border border-gray-300 text-sm text-gray-800 leading-relaxed">
                                <p>
                                    I HEREBY AUTHORIZE THE ABOVE NAMED AGENT TO DEDUCT FROM MY PAY EACH PAY PERIOD THE AMOUNT CERTIFIED ABOVE AS THE REGULAR DUES AND TO REMIT SUCH AMOUNTS TO THE NEW ENGLAND POLICE BENEVOLENT ASSOCIATION IN ACCORDANCE WITH ITS ARRANGEMENTS WITH MY EMPLOYING AGENCY. I FURTHER AUTHORIZE ANY CHANGE IN THE AMOUNT TO BE DEDUCTED WHICH IS CERTIFIED BY THE ABOVE NAMED EMPLOYEE ORGANIZATION AS A UNIFORM CHANGE IN ITS DUES STRUCTURE
                                </p>
                            </div>
                        </section>

                        {/* Employee Signature */}
                        <section className="mb-8">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                                <div className="md:col-span-2">
                                    <div className="h-12 border-b-2 border-gray-900 mb-1"></div>
                                    <p className="text-xs font-bold text-gray-700">(X) SIGNATURE OF EMPLOYEE</p>
                                </div>
                                <div>
                                    <div className="h-12 border-b-2 border-gray-900 mb-1"></div>
                                    <p className="text-xs font-bold text-gray-700">(X) DATE</p>
                                </div>
                            </div>
                        </section>

                        {/* Remit To Notice */}
                        <section className="mb-8 pt-6 border-t border-gray-300">
                            <p className="text-sm font-bold text-gray-900 mb-2">* COPY SHALL BE REMITTED TO:</p>
                            <p className="text-sm text-gray-700">
                                Secretary-Treasurer, New England PBA, 7 Technology Drive, Suite 200, Chelmsford MA, 01863
                            </p>
                        </section>

                        {/* Buttons - Hidden on Print */}
                        <div className="flex gap-4 justify-center print:hidden">
                            <button
                                type="button"
                                onClick={handlePrint}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-800 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                <Printer className="w-5 h-5" />
                                Print Form
                            </button>
                            <button
                                type="button"
                                onClick={handleClear}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-500 transition-colors"
                            >
                                <RotateCcw className="w-5 h-5" />
                                Clear Form
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </main>
    );
}
