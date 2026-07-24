const FormattedQuantumOutput = ({data} : {data: string}) => {
    const dataObj = JSON.parse(data)

    // @ts-ignore
    function extractTypes(data:any) {
        // Handle null values (typeof null is 'object' in JS, which is a known quirk)
        if (data === null) return 'null';

        // Handle Arrays
        if (Array.isArray(data)) {
            if (data.length === 0) return 'any[]';
            // Grab the type of the first element in the array
            return `${extractTypes(data[0])}[]`;
        }

        // Handle Objects recursively
        if (typeof data === 'object') {
            const schema = {};
            for (const key in data) {
                // @ts-ignore
                schema[key] = extractTypes(data[key]);
            }
            return schema;
        }

        // Handle Primitives (strings, numbers, booleans)
        return typeof data;
    }

    console.log(extractTypes(dataObj));

    return (
        <div>
            {data}

            \\
        </div>
    );
};

export default FormattedQuantumOutput;
