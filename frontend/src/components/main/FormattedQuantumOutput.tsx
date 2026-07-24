const FormattedQuantumOutput = ({data} : {data: string}) => {
    const dataObj = JSON.parse(data)

    console.log(dataObj)

    return (
        <div>
            {data}

            \\
        </div>
    );
};

export default FormattedQuantumOutput;
